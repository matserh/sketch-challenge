#!/bin/bash
ZIP_B64=$(cat /home/z/my-project/deploy-b64.txt)

curl -s -X POST https://anyclaw.store/api/deploy \
  -H "Content-Type: application/json" \
  -d "{\n    \"app_id\": \"sketch-challenge\",\n    \"zip_b64\": \"$ZIP_B64\",\n    \"app_type\": \"game\",\n    \"site_map\": [\"/\", \"/classement\"]\n  }"
