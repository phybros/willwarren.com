+++
Description = ""
date = 2011-08-12
title = "OwnerDrawing a TreeNode in .NET"
slug = "ownerdrawing-a-treenode-in-net"
tags = ["coding", "projects", "dotnet", "ui"]

+++

I've used the TreeView control in .NET extensively, but one thing I always wanted to be able to do is have "sub titles" on the tree nodes. [Eclipse](http://www.eclipse.org/) uses them extensively on their Package Explorer<!--more-->:

{{< figure src="/images/2011/08/node-subtitles.png" link="/images/2011/08/node-subtitles.png" title="Eclipse uses node 'subtitles' in its package explorer window to display additional information about a file or package" alt="Node subtitles in Eclipse" >}}

The problem with using Eclipse's implentation is that Eclipse is written in Java. All is not lost however, because it turns out it's super easy to achieve the same effect in .NET WinForms.

## Configuring the TreeView

The first step is to set some properties on the TreeView that will allow you to take over the responsibility of drawing its TreeNodes.

Set the `DrawMode` property of the TreeView to `OwnerDrawText`. This means that we don't have to bother drawing the lines, images, plus/minus boxes etc -  just the text.

## Writing the code

Next, add a new Sub to handle the DrawNode event on the TreeView.

```vbnet
Private Sub DrawNode(ByVal sender As Object, ByVal e As DrawTreeNodeEventArgs) Handles myTreeView.DrawNode
    e.DrawDefault = True
    TextRenderer.DrawText(e.Graphics, e.Node.Name, e.Node.NodeFont, New Point(e.Node.Bounds.Right + 2, e.Node.Bounds.Top), SystemColors.GrayText, SystemColors.Window)
End Sub
```

Lets go through the code.

```vbnet
e.DrawDefault = True
```

This line tells the TreeView to draw the node just like it usually would

```vbnet
TextRenderer.DrawText(e.Graphics, e.Node.Name, e.Node.NodeFont, New Point(e.Node.Bounds.Right + 2, e.Node.Bounds.Top), SystemColors.GrayText, SystemColors.Window)
```

This line draws additional text (using the `Node.Name` property) next to the Node, using the color `SystemColors.GrayText`.

## The Result

Here is a screenshot of the code in action. Each node that has its `Name` property set receives a subtitle.

{{< figure src="/images/2011/08/ownerdraw-demo.png" link="/images/2011/08/ownerdraw-demo.png" title="The code in action" alt="Screenshot of the code in action" >}}

## Download the code and find out more

[OwnerDrawTest.zip](/files/2011/08/OwnerDrawTest.zip) (13KB)

To find out more about OwnerDrawing visit https://msdn.microsoft.com/en-us/library/system.windows.forms.treeview.drawnode.aspx
