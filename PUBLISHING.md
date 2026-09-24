# Publishing on GitHub

How to put Commander Bracket Rater online with GitHub Pages.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole rater: a normal web page with no build step. |
| `README.md` | The page GitHub shows for the project. |
| `.nojekyll` | Empty file that tells GitHub Pages to serve the files as they are. |
| `PUBLISHING.md` | These instructions. |

## 1. Create the repository

1. Go to https://github.com/new and sign in.
2. Set **Repository name** to `commander-bracket-rater`.
3. Choose **Public**. The free GitHub Pages plan only publishes public repositories.
4. Leave **Add a README** unticked, because you already have one.
5. Click **Create repository**.

## 2. Upload the files

### Option A: in the browser (easiest)

1. On the new repository's page, click **uploading an existing file**.
2. Drag in `index.html` and `README.md`.
3. Click **Commit changes**.

Windows File Explorer hides `.nojekyll` and it's easy to miss when dragging. The site works without it, so you can skip it.

### Option B: from the terminal

This uploads every file in the folder. Run it in `C:\Users\alexa\commander-bracket-rater`, replacing `YOUR-USERNAME` with your GitHub username:

```
git init
git add .
git commit -m "Add Commander Bracket Rater"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/commander-bracket-rater.git
git push -u origin main
```

The first push opens a browser window to sign in to GitHub.

## 3. Turn on GitHub Pages

1. In the repository, go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Set **Branch** to `main` and the folder to `/ (root)`, then click **Save**.
4. Wait a minute or two, then refresh the page. It shows your address:
   `https://YOUR-USERNAME.github.io/commander-bracket-rater/`

## 4. Finish up

- In `README.md`, replace `YOUR-USERNAME` in the live-site link with your username.
- To let others reuse the code, add a license: go to **Add file → Create new file**, name it `LICENSE`, and pick a template such as MIT.

## Updating the site later

When Wizards updates the Game Changers list (the live list is at https://scryfall.com/search?q=is%3Agamechanger), edit the `GAME_CHANGERS` list in `index.html`, then either:

- **Browser:** open `index.html` in the repository, click the pencil icon, paste in the new version and click **Commit changes**, or
- **Terminal:**
  ```
  git add index.html
  git commit -m "Update Game Changers list"
  git push
  ```

The site updates within a minute or two.
