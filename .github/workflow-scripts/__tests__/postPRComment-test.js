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
const postPRComment = require('../postPRComment');
const {_getApiChangesMessage, _COMMENT_MARKER} = postPRComment;

jest.mock('fs');

describe('postPRComment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('_getApiChangesMessage', () => {
    it('returns null if output.json does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const result = _getApiChangesMessage('/tmp/scratch');

      expect(result).toBeNull();
      expect(fs.existsSync).toHaveBeenCalledWith('/tmp/scratch/output.json');
    });

    it('returns null if output.json is empty', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('   ');

      const result = _getApiChangesMessage('/tmp/scratch');

      expect(result).toBeNull();
    });

    it('returns null if changedApis is empty array', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({result: 'NO_CHANGES', changedApis: []}),
      );

      const result = _getApiChangesMessage('/tmp/scratch');

      expect(result).toBeNull();
    });

    it('returns null if changedApis is missing', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({otherField: 'value'}));

      const result = _getApiChangesMessage('/tmp/scratch');

      expect(result).toBeNull();
    });

    it('returns formatted message when changedApis has items', () => {
      const data = {
        result: 'POTENTIALLY_NON_BREAKING',
        changedApis: ['TestType'],
      };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(data));

      const result = _getApiChangesMessage('/tmp/scratch');

      expect(result).toContain('### API Changes Detected');
      expect(result).toContain('TestType');
    });

    it('returns raw content if JSON parsing fails', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('not valid json');

      const result = _getApiChangesMessage('/tmp/scratch');

      expect(result).toBe('not valid json');
    });
  });

  describe('postPRComment', () => {
    const mockGithub = {
      rest: {
        issues: {
          listComments: jest.fn(),
          createComment: jest.fn(),
          updateComment: jest.fn(),
          deleteComment: jest.fn(),
        },
      },
    };

    const mockContext = {
      repo: {owner: 'facebook', repo: 'react-native'},
      payload: {pull_request: {number: 123}},
    };

    beforeEach(() => {
      mockGithub.rest.issues.listComments.mockResolvedValue({data: []});
      mockGithub.rest.issues.createComment.mockResolvedValue({});
      mockGithub.rest.issues.updateComment.mockResolvedValue({});
      mockGithub.rest.issues.deleteComment.mockResolvedValue({});
    });

    it('does nothing when no scratchDir and no existing comment', async () => {
      await postPRComment(mockGithub, mockContext, {});

      expect(mockGithub.rest.issues.createComment).not.toHaveBeenCalled();
      expect(mockGithub.rest.issues.deleteComment).not.toHaveBeenCalled();
    });

    it('deletes existing comment when nothing to report', async () => {
      const existingComment = {
        id: 456,
        body: `${_COMMENT_MARKER}\nOld content`,
      };
      mockGithub.rest.issues.listComments.mockResolvedValue({
        data: [existingComment],
      });
      fs.existsSync.mockReturnValue(false);

      await postPRComment(mockGithub, mockContext, {
        scratchDir: '/tmp/scratch',
      });

      expect(mockGithub.rest.issues.deleteComment).toHaveBeenCalledWith({
        owner: 'facebook',
        repo: 'react-native',
        comment_id: 456,
      });
    });

    it('creates new comment when there are issues to report', async () => {
      const data = {result: 'POTENTIALLY_NON_BREAKING', changedApis: ['Test']};
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(data));

      await postPRComment(mockGithub, mockContext, {
        scratchDir: '/tmp/scratch',
      });

      expect(mockGithub.rest.issues.createComment).toHaveBeenCalledWith({
        owner: 'facebook',
        repo: 'react-native',
        issue_number: 123,
        body: expect.stringContaining(_COMMENT_MARKER),
      });
    });

    it('updates existing comment when there are issues to report', async () => {
      const existingComment = {
        id: 789,
        body: `${_COMMENT_MARKER}\nOld content`,
      };
      mockGithub.rest.issues.listComments.mockResolvedValue({
        data: [existingComment],
      });
      const data = {result: 'POTENTIALLY_NON_BREAKING', changedApis: ['Test']};
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(data));

      await postPRComment(mockGithub, mockContext, {
        scratchDir: '/tmp/scratch',
      });

      expect(mockGithub.rest.issues.updateComment).toHaveBeenCalledWith({
        owner: 'facebook',
        repo: 'react-native',
        comment_id: 789,
        body: expect.stringContaining(_COMMENT_MARKER),
      });
      expect(mockGithub.rest.issues.createComment).not.toHaveBeenCalled();
    });
  });
});
