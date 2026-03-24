#!/usr/bin/env sh
set -eu

awslocal s3 mb s3://input || true
awslocal s3 mb s3://output || true

awslocal sqs create-queue --queue-name transcode >/dev/null 2>&1 || true

