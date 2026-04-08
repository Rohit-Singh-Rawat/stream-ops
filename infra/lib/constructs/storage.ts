import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface StorageProps {
  readonly accountId: string;
  readonly region: string;
}

export class Storage extends Construct {
  public readonly inputBucket: s3.Bucket;
  public readonly outputBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  /** Base URL for all CloudFront-served output assets (no trailing slash). */
  public readonly assetBaseUrl: string;

  constructor(scope: Construct, id: string, props: StorageProps) {
    super(scope, id);

    const suffix = `${props.region}-${props.accountId}`;

    this.inputBucket = new s3.Bucket(this, 'Input', {
      bucketName: `stream-ops-input-${suffix}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: 'expire-originals',
          // Originals are no longer needed after transcoding. 7 days covers failed-job investigation.
          expiration: cdk.Duration.days(7),
        },
      ],
    });

    this.outputBucket = new s3.Bucket(this, 'Output', {
      bucketName: `stream-ops-output-${suffix}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    });

    const hlsSegmentPolicy = new cloudfront.CachePolicy(this, 'HlsSegmentPolicy', {
      cachePolicyName: 'stream-ops-hls-segments',
      // Segments are immutable once written — safe to cache indefinitely.
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const hlsPlaylistPolicy = new cloudfront.CachePolicy(this, 'HlsPlaylistPolicy', {
      cachePolicyName: 'stream-ops-hls-playlists',
      // Playlists are rewritten by the worker during processing — short TTL prevents stale data.
      defaultTtl: cdk.Duration.seconds(5),
      maxTtl: cdk.Duration.seconds(30),
      minTtl: cdk.Duration.seconds(0),
    });

    // OAC grants CloudFront exclusive read access to the output bucket — S3 stays fully private.
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.outputBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        compress: true,
      },
      additionalBehaviors: {
        '*.ts': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(this.outputBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: hlsSegmentPolicy,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          compress: false, // binary segments gain nothing from compression
        },
        '*.m3u8': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(this.outputBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: hlsPlaylistPolicy,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          compress: true,
        },
      },
      // PriceClass_100 covers US + Europe. Expand to 200/All for global audiences.
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    this.assetBaseUrl = `https://${this.distribution.distributionDomainName}`;
  }
}
