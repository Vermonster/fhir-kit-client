# How Can I Contribute?

FHIRKit Client is an open source Node.js FHIR client library that welcomes community contributions with enthusiasm. If you are new to open source, here are two great resources to help get you started: [Understanding the GitHub Flow](https://guides.github.com/introduction/flow/) and [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/).

## Code of Conduct

All are welcome to contribute. By participating in this project, you agree to
follow the Contributor Convent [code of
conduct](https://github.com/Vermonster/fhir-kit-client/blob/master/CODE_OF_CONDUCT.md).

## Submit a Bug Report

Before submitting a report, first try [debugging](#debugging), reading through the [documentation](https://vermonster.github.io/fhir-kit-client/fhir-client/0.1.0/), and reviewing [existing issues](https://github.com/Vermonster/fhir-kit-client/issues) to make sure the bug isn't fixable or already reported.

Bugs are tracked as [GitHub issues](https://guides.github.com/features/issues/). Provide the following information by filling in the [issue template](https://github.com/Vermonster/fhir-kit-client/blob/master/issue_template.md):

  - Use a clear and descriptive title for the issue to identify the problem.
  - Describe the exact steps which reproduce the problem with as many details as possible.
  - Provide specific examples to demonstrate the steps. Include links to files or GitHub projects, or copy/pasteable snippets, which you use in those examples. If you're providing snippets in the issue, use Markdown code blocks.
  - Describe the behavior you observed after following the steps and point out what exactly is the problem with that behavior.
  - Explain which behavior you expected to see instead and why.
  - If the problem wasn't triggered by a specific action, provide context by describing what you were doing before the problem happened.

## Suggest an Enhancement

Enhancement suggestions are also tracked as [GitHub issues](https://guides.github.com/features/issues/). Suggest an enhancement by creating an issue and providing the following information:

  - Use a clear and descriptive title for the issue to identify the suggestion.
  - Provide a step-by-step description of the suggested enhancement with as many details as possible.
  - Provide specific examples to demonstrate the steps. Include copy/pasteable snippets which you use in those examples, as Markdown code blocks.
  - Describe the current behavior and explain which behavior you wish to see in addition and why.

## Submit a Bugfix or Enhancement

  - After proposing your solution in the relevant issue discussion, you may open a new GitHub Pull Request (PR) with the fix and link to it within the discussion.
  - Ensure that the PR description clearly describes the problem and solution. Include the relevant issue number.

# Debugging

There are at least two ways to use an interactive debugger in tests (and several [additional debugging methods](https://nodejs.org/en/docs/guides/debugging-getting-started/) for node applications in general).

## Chrome Inspector

This approach has more manual steps for each test run, but gives a superior interactive interface.
Invoke the tests with:

```
yarn test -- --inspect-brk
```

Then in Chrome, visit `chrome://inspect`. Under "Remote Target" section you'll see the option to inspect the running debugger. Execution will be paused at the beginning, so use the "Resume Execution" button, and the tests will run until they encounter a `debugger` statement.
After you continue and the tests complete, the test command will wait until you close the inspector to finish the test run.

## Node Debugger

This approach is quicker and dirtier. Invoke the tests with:

```
yarn test -- debug
```

Execution will be paused at the beginning, so at the `debug>` prompt enter `c` to continue execution. When a `debugger` statement is reached you will have the `debug>` prompt, but the execution context is not the context of the `debugger` statement.
Therefore enter `repl` command to enter that context. When you're ready to proceed, use `Ctrl-C` to exit the debug repl, and you will be back at the `debug>` prompt, where you can enter `c` to continue.
