# NoTube

A **Firefox** and **Chrome** extension that hides all videos on the YouTube home page during a scheduled time period.

## Features

- Hides recommended videos, Shorts, and other feed cards on the home page (`youtube.com`)
- Configurable time window (e.g. `22:00`–`08:00` spanning midnight)
- Quick settings via popup
- On-page notification when blocking is active

## Install in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** in the top-right corner
3. Click **Load unpacked**
4. Select the `plugin` project folder

> The extension stays installed after restarting the browser.

## Install in Firefox

1. Open `about:debugging` in the address bar
2. Click **This Firefox**
3. Click **Load Temporary Add-on**
4. Select the `manifest.json` file from this project folder

> Temporary add-ons are removed after restarting the browser. For a permanent install, publish the extension on [addons.mozilla.org](https://addons.mozilla.org) or use Firefox Developer Edition / ESR with signature checks disabled.

## Configuration

1. Click the extension icon in the toolbar
2. Set the start and end times for blocking
3. Click **Save**

### Examples

| Interval    | Behavior                                      |
|-------------|-----------------------------------------------|
| 09:00–18:00 | Hides videos during the day only              |
| 22:00–08:00 | Hides videos at night (spans midnight)        |
| 00:00–00:00 | Hides videos always (when start equals end)   |

## How it works

The extension runs a content script on `youtube.com`, checks the current time, and hides feed items on the home page. Newly loaded videos during scrolling are also hidden via a `MutationObserver`.

Direct video links (`/watch?v=...`) and other YouTube pages are not affected.
