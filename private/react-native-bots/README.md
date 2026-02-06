## Code Analysis Bot

The code analysis bot provides lint and other results as inline reviews on GitHub. It runs as part of the Circle CI analysis workflow.

If you want to test changes to the Code Analysis Bot, I'd recommend checking out an existing PR and then running the `analyze pr` command.
You'll need a GitHub token. You can re-use this one: `312d354b5c36f082cfe9` `07973d757026bdd9f196` (just remove the space).
So, for example:

```
GITHUB_TOKEN=[ENV_ABOVE] GITHUB_PR_NUMBER=1234 yarn lint-ci
```
