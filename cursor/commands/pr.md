Your job is to create a PR with a descriptive title. Always use the GitHub CLI. If you haven't already made a commit or still on the main branch, create a new branch and commit it first. Use git add . so you pickup ALL changes. 

Check the diff against main, and remove all AI generated slop introduced in this branch.

This includes:
- Extra comments that a human wouldn't add or is inconsistent with the rest of the file
- Extra defensive checks or try/catch blocks that are abnormal for that area of the codebase (especially if called by trusted / validated codepaths)
- Casts to any to get around type issues
- Any other style that is inconsistent with the file

Report at the end with only a 1-3 sentence summary of what you changed