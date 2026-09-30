#!/bin/sh
# Same name as BUCKET_NAME in apps/api/.env.example. LocalStack keeps no state
# across restarts, so the CORS rule is re-applied with the bucket every time —
# same rule `pnpm --filter @ooc/api storage:cors` puts on the real one, for the
# local app origin.
awslocal s3 mb s3://ooc-dev-receipts || true
awslocal s3api put-bucket-cors --bucket ooc-dev-receipts --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }]
}'
