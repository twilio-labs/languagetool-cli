# LanguageTool CLI

This is a tool that will scan the specified Markdown documents with LanguageTool and then report on any issues found. The output format is also Markdown so that the results can be included in a GitHub pull request comment.

## Installation

```sh
npm install -g @twilio-labs/languagetool-cli
```

## Usage

```sh
languagetool-cli file1.md file2.md ... fileN.md
```

Example:

```sh
languagetool-cli sample.md
```

Redirect output to a file:

```sh
languagetool-cli sample.md > output.md
```

## Configuration

If you would like to use a different URL for the LanguageTool service, set the `LT_URL` environment variable like so:

```sh
export LT_URL="http://localhost:8081/v2"
```
