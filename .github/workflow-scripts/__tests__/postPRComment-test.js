/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const postPRComment = require('../postPRComment');
const {_COMMENT_MARKER} = postPRComment;

describe('postPRComment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

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

  it('does nothing when no messages and no existing comment', async () => {
    await postPRComment(mockGithub, mockContext, {messages: []});

    expect(mockGithub.rest.issues.createComment).not.toHaveBeenCalled();
    expect(mockGithub.rest.issues.deleteComment).not.toHaveBeenCalled();
  });

  it('filters out empty and null messages', async () => {
    await postPRComment(mockGithub, mockContext, {
      messages: ['', null, '   ', undefined],
    });

    expect(mockGithub.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it('deletes existing comment when no messages to report', async () => {
    const existingComment = {
      id: 456,
      body: `${_COMMENT_MARKER}\nOld content`,
    };
    mockGithub.rest.issues.listComments.mockResolvedValue({
      data: [existingComment],
    });

    await postPRComment(mockGithub, mockContext, {messages: []});

    expect(mockGithub.rest.issues.deleteComment).toHaveBeenCalledWith({
      owner: 'facebook',
      repo: 'react-native',
      comment_id: 456,
    });
  });

  it('creates new comment when there are messages', async () => {
    await postPRComment(mockGithub, mockContext, {
      messages: ['### Test Message\n\nSome content'],
    });

    expect(mockGithub.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'facebook',
      repo: 'react-native',
      issue_number: 123,
      body: expect.stringContaining(_COMMENT_MARKER),
    });
    expect(mockGithub.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'facebook',
      repo: 'react-native',
      issue_number: 123,
      body: expect.stringContaining('Test Message'),
    });
  });

  it('updates existing comment when there are messages', async () => {
    const existingComment = {
      id: 789,
      body: `${_COMMENT_MARKER}\nOld content`,
    };
    mockGithub.rest.issues.listComments.mockResolvedValue({
      data: [existingComment],
    });

    await postPRComment(mockGithub, mockContext, {
      messages: ['### Updated Message'],
    });

    expect(mockGithub.rest.issues.updateComment).toHaveBeenCalledWith({
      owner: 'facebook',
      repo: 'react-native',
      comment_id: 789,
      body: expect.stringContaining(_COMMENT_MARKER),
    });
    expect(mockGithub.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it('combines multiple messages with double newlines', async () => {
    await postPRComment(mockGithub, mockContext, {
      messages: ['Message 1', 'Message 2'],
    });

    expect(mockGithub.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'facebook',
      repo: 'react-native',
      issue_number: 123,
      body: expect.stringContaining('Message 1\n\nMessage 2'),
    });
  });
});
