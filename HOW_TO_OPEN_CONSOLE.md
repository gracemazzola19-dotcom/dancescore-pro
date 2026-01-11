# How to Open Browser Console (Developer Tools)

## For Mac Users (you're on macOS)

### Method 1: Keyboard Shortcut (Easiest)
- Press: **Cmd + Option + I** (Command + Option + I)
  OR
- Press: **Cmd + Option + J** (opens Console directly)

### Method 2: Right-Click
1. Right-click anywhere on the webpage
2. Click **"Inspect"** or **"Inspect Element"**
3. Click the **"Console"** tab at the top

### Method 3: Menu Bar
- **Chrome**: View → Developer → Developer Tools
- **Safari**: Develop → Show JavaScript Console
  - (You may need to enable Develop menu in Safari preferences first)
- **Edge**: View → Developer → Developer Tools

## For Windows/Linux Users

### Method 1: Keyboard Shortcut
- Press: **F12**
  OR
- Press: **Ctrl + Shift + I**
  OR
- Press: **Ctrl + Shift + J** (opens Console directly)

### Method 2: Right-Click
1. Right-click anywhere on the webpage
2. Click **"Inspect"** or **"Inspect Element"**
3. Click the **"Console"** tab at the top

## Once Console is Open

1. **Click the "Console" tab** (if not already selected)
2. **Look for RED error messages** - these are the errors
3. **Try to submit make-up again** while the console is open
4. **Copy/paste any error messages** you see (especially red ones)

## What to Look For

- **Red error messages** - These are the errors I need to see
- Messages that say "Error submitting make-up:"
- Messages that say "Error details:"
- Any messages that mention "/api/make-up-submissions"

## Alternative: Network Tab

If you can't find errors in Console:

1. Open Developer Tools (Cmd + Option + I on Mac, F12 on Windows)
2. Click the **"Network"** tab
3. Try to submit make-up again
4. Look for a request to **"/api/make-up-submissions"**
5. Click on it
6. Click the **"Response"** tab
7. Copy/paste what you see there
