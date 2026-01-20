/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const COMMENT_MARKER = '<!-- react-native-bot -->';

/**
 * Posts a PR validation comment, updates an existing one, or deletes it if there's nothing to report.
 *
 * @param {Object} github - The octokit client from actions/github-script
 * @param {Object} context - The GitHub Actions context
 * @param {Object} options - Options for the comment
 * @param {string[]} [options.messages] - Array of message strings to include in the comment
 */
async function postPRComment(github, context, options) {
  const {owner, repo} = context.repo;
  const prNumber = context.payload.pull_request.number;

  const sections = (options.messages || []).filter(
    msg => msg != null && msg.trim() !== '',
  );

  const {data: comments} = await github.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
  });

  const existingComment = comments.find(comment =>
    comment.body.includes(COMMENT_MARKER),
  );

  if (sections.length === 0) {
    console.log('No issues to report');
    if (existingComment) {
      console.log(`Deleting existing comment ${existingComment.id}`);
      await github.rest.issues.deleteComment({
        owner,
        repo,
        comment_id: existingComment.id,
      });
    }
    return;
  }

  const commentBody = `${COMMENT_MARKER}
## PR Validation

${sections.join('\n\n')}`;

  if (existingComment) {
    console.log(`Updating existing comment ${existingComment.id}`);
    await github.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body: commentBody,
    });
  } else {
    console.log('Creating new comment');
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: commentBody,
    });
  }
}

module.exports = postPRComment;
// Exported for testing purposes
module.exports._COMMENT_MARKER = COMMENT_MARKER;
