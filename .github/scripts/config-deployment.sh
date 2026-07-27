set -euo pipefail

COVERAGE_RESULT="${COVERAGE_RESULT:-not_configured}"
COVERAGE_PERCENTAGE="${COVERAGE_PERCENTAGE:-not_available}"
COVERAGE_THRESHOLD="${COVERAGE_THRESHOLD:-not_available}"
SONAR_URL="${SONAR_URL:-not_available}"
COMMIT_MESSAGE="$(git log -1 --pretty=%B)"
IMAGE_NAME="${IMAGE_NAME:-not_available}"

case "$SIMULATE_FAILURE" in
  true|false) ;;
  *) SIMULATE_FAILURE=false ;;
esac

jq -n \
  --arg image_name "$IMAGE_NAME" \
  --arg service_name "$SERVICE_NAME" \
  --arg repository "$SOURCE_REPOSITORY" \
  --arg branch "$SOURCE_BRANCH" \
  --arg commit_sha "$SOURCE_COMMIT_SHA" \
  --arg commit_message "$COMMIT_MESSAGE" \
  --arg actor "$SOURCE_ACTOR" \
  --arg quality_result "$QUALITY_RESULT" \
  --arg coverage_result "$COVERAGE_RESULT" \
  --arg coverage_percentage "$COVERAGE_PERCENTAGE" \
  --arg coverage_threshold "$COVERAGE_THRESHOLD" \
  --arg sonar_url "$SONAR_URL" \
  --arg build_result "$BUILD_RESULT" \
  --arg workflow_url "$SOURCE_WORKFLOW_URL" \
  --argjson simulate_failure "$SIMULATE_FAILURE" \
  '{
    event_type: "deploy-service",
    client_payload: {
      service: {
        name: $service_name,
        repository: $repository,
        branch: $branch
      },
      commit: {
        sha: $commit_sha,
        message: $commit_message,
        actor: $actor
      },
      quality: {
        result: $quality_result,
        coverage_result: $coverage_result,
        coverage_percentage: $coverage_percentage,
        coverage_threshold: $coverage_threshold,
        sonar_url: $sonar_url
      },
      build: {
        result: $build_result,
        image_name: $image_name
      },
      source: {
        workflow_url: $workflow_url
      },
      options: {
        simulate_deploy_failure: $simulate_failure
      }
    }
  }' > dispatch.json

gh api \
  --method POST \
  "repos/$CONFIG_REPOSITORY/dispatches" \
  --input dispatch.json

echo "Config 중앙 배포 요청 완료: $CONFIG_REPOSITORY"