/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

'use strict';

const {validate} = require('@rnx-kit/rn-changelog-generator').default;

/**
 * Validates PR body for required sections.
 *
 * @param {string} prBody - The PR body text
 * @returns {{message: string, result: 'PASS'|'FAIL'}} - Formatted message and result
 */
function validatePRBody(prBody) {
  const body = prBody ?? '';
  const bodyLower = body.toLowerCase();
  const isFromPhabricator = bodyLower.includes('differential revision:');

  const messages = [];
  let hasFail = false;

  function addWarning(title, text) {
    messages.push(`> [!WARNING]
> **${title}**
>
> ${text}`);
  }

  function addFail(title, text) {
    hasFail = true;
    messages.push(`> [!CAUTION]
> **${title}**
>
> ${text}`);
  }

  // 1. Check body length
  if (!body || body.length < 50) {
    addFail('Missing Description', 'This pull request needs a description.');
  } else {
    // 2. Check summary section (skip for Phabricator)
    const hasSummary =
      bodyLower.includes('## summary') || bodyLower.includes('summary:');
    if (!hasSummary && body.split('\n').length <= 2 && !isFromPhabricator) {
      addWarning(
        'Missing Summary',
        'Can you add a Summary? To do so, add a "## Summary" section to your PR description. This is a good place to explain the motivation for making this change.',
      );
    }
  }

  // 3. Check test plan (skip for Phabricator)
  if (!isFromPhabricator) {
    const hasTestPlan = ['## test plan', 'test plan:', 'tests:', 'test:'].some(
      t => bodyLower.includes(t),
    );
    if (!hasTestPlan) {
      addWarning(
        'Missing Test Plan',
        'Can you add a Test Plan? To do so, add a "## Test Plan" section to your PR description. A Test Plan lets us know how these changes were tested.',
      );
    }
  }

  // 4. Validate changelog (skip for Phabricator)
  if (!isFromPhabricator) {
    const status = validate(body);
    const link =
      'https://reactnative.dev/contributing/changelogs-in-pull-requests';
    if (status === 'missing') {
      addFail(
        'Missing Changelog',
        `Please add a Changelog to your PR description. See [Changelog format](${link})`,
      );
    } else if (status === 'invalid') {
      addFail(
        'Invalid Changelog Format',
        `Please verify your Changelog format. See [Changelog format](${link})`,
      );
    }
  }

  return {
    message: messages.join('\n\n'),
    result: hasFail ? 'FAIL' : 'PASS',
  };
}

module.exports = validatePRBody;
