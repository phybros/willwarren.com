+++
date = "2013-04-20 11:01:08+00:00"
title = "Reverting a git commit after pushing to remote"
type = "post"
slug = "reverting-a-git-commit-after-pushing-to-remote"
tags = ["git", "coding"]

+++

Imagine a scenario where you have a git repo with 2 branches; `master`, the production-ready branch and `dev`, the branch where all the development occurs.

Now imagine that you accidentally made a commit on `master`, when really it should have been on `dev`. If you have not yet pushed to a remote repository (like Github), you can undo that commit using `git reset` like so:
<!--more-->
```bash
git reset --soft HEAD~1
```

This will bring your repository back to the state it was in right before you did your `git commit`. Now you can switch to your `dev` branch and re-commit the changes in the right place.

The `--soft` option tells git to leave your index (or "staging area") and your working tree alone. If you were to run this same command with `--hard` it would trash all your local changes. This is fine if you want to throw all your work away, but if the work is good, just the commit was bad, then use `--soft`.

The `HEAD~1` just means "the latest commit's parent". It could also be written as `HEAD~` or `HEAD^`.

This is all well and good, but what if you had `git push`ed right after doing the erroneous commit? If you just try the steps outlined above, and then try and push to your remote repo, you will get an error because the tip of your local repo is behind that of the remote and it will reject your push.

This is where you need to use `git revert`.

```bash
git revert HEAD
```

This command essentially says, "I want to create a new commit that undoes the commit pointed to by `HEAD`". Once the command has been executed, it creates a new commit which you can push back to your remote repo which will effectively create a patch which undoes all the changes in the last commit.

Simple! If you want to really dig into the documentation, I suggest going here: http://git-scm.com/docs/git-reset and here: http://git-scm.com/docs/git-revert.html
