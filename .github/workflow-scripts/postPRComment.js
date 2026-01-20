/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const fs = require('fs');
const path = require('path');

const COMMENT_MARKER = '<!-- react-native-bot -->';

/**
 * Reads the API changes output file if it exists.
 * @param {string} scratchDir - Path to the scratch directory
 * @returns {string|null} - The formatted API changes message, or null if no changes
 */
function getApiChangesMessage(scratchDir) {
  const outputPath = path.join(scratchDir, 'output.json');
  if (!fs.existsSync(outputPath)) {
    return null;
  }

  const content = fs.readFileSync(outputPath, 'utf8').trim();
  if (!content) {
    return null;
  }

  try {
    const data = JSON.parse(content);
    if (!data.breakingChanges || data.breakingChanges.length === 0) {
      return null;
    }
    return `### API Changes Detected\n\n${JSON.stringify(data, null, 2)}`;
  } catch {
    return content || null;
  }
}

/**
 * Posts a PR validation comment, updates an existing one, or deletes it if there's nothing to report.
 *
 * @param {Object} github - The octokit client from actions/github-script
 * @param {Object} context - The GitHub Actions context
 * @param {Object} options - Options for the comment
 * @param {string} [options.scratchDir] - Path to the scratch directory containing check outputs
 */
async function postPRComment(github, context, options) {
  const {owner, repo} = context.repo;
  const prNumber = context.payload.pull_request.number;

  const sections = [];

  if (options.scratchDir) {
    const apiChanges = getApiChangesMessage(options.scratchDir);
    if (apiChanges) {
      sections.push(apiChanges);
    }
  }

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
