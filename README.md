# Recipe Box

Recipe Box is a simple webapp for storing, managing, and sharing my own personal recipes. I tried a
bunch of apps and sites a while back and even the best ones I could find were basically free form
text editors. Personally, I don't want to do a lot of typesetting standing in my kitchen. I also
dislike popping back and forth between the ingredients and the step that I'm on to find out what
"Add the milk" actually means.

So, Recipe Box makes it easy to build a list of ingredients, and step-by-step instructions that can
reference the ingredients and have their measurements included in the printable instructions.

Recipes are stored first in the local browser to allow offline and logged-out editing and viewing.
If you're logged in they're also synced to an Azure Blob store via simple API using last-edit-wins
reconciliation strategy.


# Copyright

Recipe Box Copyright 2025 Raymond W. Wallace III

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
