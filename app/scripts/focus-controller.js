// Copyright 2013 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * This controller will take care of determining where the focus moves when
 * a key press or mouse movement has occurred
 *
 * @constructor
 */
function FocusController() {
    'use strict';

    var debugMode = false;
    var focusableItems = [];
    var moving = false;
    var currentlyFocusedItem = null;

    /**
    * Check whether a focusable item is already in the item array
    * @param {FocusableItem} item Check to see if the FocusableItem is already
    * in the FocusController
    */
    this.isFocusableItem = function (item) {
        for(var i = 0; i < focusableItems.length; i++) {
            if(focusableItems[i] === item) {
                return true;
            }
        }
        return false;
    };

    /**
    * Push a focusable item onto item array
    * @private
    * @param {FocusableItem} item
    */
    this.pushFocusableItem = function (item) {
        focusableItems.push(item);
        item.getElement().addEventListener('focus', function() {
            currentlyFocusedItem = item;
        }, false);
        return focusableItems.length - 1;
    };

    /**
    * Remove a focusable item from the controller
    * @param {FocusableItem} item The item to remove
    */
    this.removeFocusableItem = function (item) {
        for(var i = 0; i < focusableItems.length; i++) {
            if(focusableItems[i] === item) {
                focusableItems.splice(i, 1);
                return true;
            }
        }
        return false;
    };

    /**
     * Remove all of the items in the focusableItems
     * array
     */
    this.removeAllFocusableItems = function() {
        focusableItems = [];
    };

    /**
    * Get the number of focusable items in the controller
    */
    this.getFocusableItemCount = function () {
        return focusableItems.length;
    };

    /**
    * Get a focusable item at a particular index in the array
    * @param {int} index
    */
    this.getFocusableItem = function (index) {
        if(index >= focusableItems.length) {
            return null;
        }

        return focusableItems[index];
    };

    /**
    * Get the currently focused FocusableItem
    */
    this.getCurrentlyFocusedItem = function () {
        return currentlyFocusedItem;
    };

    /**
    * Is the focus currently moving
    */
    this.isMoving = function () {
        return moving;
    };

    /**
    * This method performs a change of focus to the item index
    * @param {int} itemIndex
    */
    this.setCurrentFocusItem = function (itemIndex) {
        var focusableItem = this.getFocusableItem(itemIndex);
        currentlyFocusedItem = focusableItem;
        if(currentlyFocusedItem !== null) {
            currentlyFocusedItem.getElement().focus();
        }
    };

    /**
    * This will take a direction vector and move the focus to the most
    * appropriate item or make no change if there are no items to move to
    * @param {array} direction A direction vector [x, y]
    */
    this.moveFocus = function (direction) {
        // We need an item to move down from
        // TODO: Should initialise focus if not initialised...
        if(!currentlyFocusedItem) {
            return;
        }

        var nextItemIndex = null;
        if(direction.y === 0) {
            if(direction.x > 0) {
                // Move Right
                nextItemIndex = currentlyFocusedItem.getRightFocusItemIndex();
            } else {
                // Move Left
                nextItemIndex = currentlyFocusedItem.getLeftFocusItemIndex();
            }
        } else if(direction.x === 0) {
            if(direction.y > 0) {
                // Move Up
                nextItemIndex = currentlyFocusedItem.getTopFocusItemIndex();
            } else {
                // Move Down
                nextItemIndex = currentlyFocusedItem.getBottomFocusItemIndex();
            }
        }

        if(nextItemIndex !== null) {
            this.setCurrentFocusItem(nextItemIndex);
        }
    };

    /**
    * Determine if the focuscontroller is in a debugmode which
    * is used to determine if debug lines should be drawn or not
    */
    this.isDebugMode = function() {
        return debugMode;
    };

    this.toggleDebugMode = function() {
        debugMode = !debugMode;
        this.updateFocusGraph();
    };

    /**
    * Calculate the distance from (0,0) to (x,y)
    */
    this.calcDistance = function(x, y) {
        return Math.floor(Math.sqrt((x * x) + (y * y)));
    };

    // Set up binding to listen for key presses
    document.addEventListener('keydown', function(e) {
            this.onKeyDown(e);
        }.bind(this), false);

    document.addEventListener('keyup', function(e) {
            this.onKeyUp(e);
        }.bind(this), false);
}

/**
* This method will add a focusable item to the controller
* @function
* @param {FocusableItem} item Focusable item to be handled by this
* FocusController
*/
FocusController.prototype.addFocusableItem = function (item) {
    'use strict';

    if(this.isFocusableItem(item)) {
        return;
    }

    this.pushFocusableItem(item);
};

/**
 * Iterate over the children and set their neighbours up
 * correctly.
 * @function
 **/
FocusController.prototype.updateFocusGraph = function() {
    'use strict';
    this.clearDebugLines();

    var itemCount = this.getFocusableItemCount();
    
    for(var i = 0; i < itemCount; i++) {
        var focusableItem = this.getFocusableItem(i);
        // If the element can't be focused, skip it.
        if(!this.isFocusable(focusableItem.getElement())) {
            continue;
        }

        this.updateNodeEdges(i);

        if(this.isDebugMode()) {
            this.printDebugLinesForNode(i, focusableItem);
        }
    }
};

FocusController.prototype.clearDebugLines = function() {
    var debugLines = document.querySelectorAll('.dpad-debug-line');
    for(var i = 0; i < debugLines.length; i++) {
        debugLines[i].remove();
    }
};

/**
 * For a given element, print it's left, right, up and down neighbours
 * The index is used to select a color for the line.
 * @function
 * @param {int} Index of the element to draw neighbours
 * @param {FocusableItem}  Item to draw neighbours for
 **/
FocusController.prototype.printDebugLinesForNode = function(index, focusableItem) {
    'use strict';

    var markerColors = [
        '#1abc9c',
        '#2ecc71',
        '#3498db',
        '#9b59b6',
        '#34495e',
        '#f1c40f',
        '#e67e22',
        '#e74c3c',
        '#ecf0f1',
        '#95a5a6'
    ];
    var markerIndex = index % markerColors.length;
    var markerColor = markerColors[markerIndex];

    var currentItemMetrics = this.getItemMetrics(focusableItem.getElement());

    var newItemMetrics, xDist, yDist, angle;

    if(focusableItem.getTopFocusItemIndex() !== null) {
        newItemMetrics = this.getItemMetrics(this.getFocusableItem(focusableItem.getTopFocusItemIndex()).getElement());
        xDist = newItemMetrics.center.x - currentItemMetrics.center.x;
        yDist = currentItemMetrics.top - newItemMetrics.center.y;

        angle = ((Math.atan2(xDist, yDist) * 180) / Math.PI) + 180;

        this.printDebugLine(this.calcDistance(xDist, yDist), (currentItemMetrics.center.x-5), currentItemMetrics.top, markerColor, angle);
    }

    if(focusableItem.getBottomFocusItemIndex() !== null) {
        newItemMetrics = this.getItemMetrics(this.getFocusableItem(focusableItem.getBottomFocusItemIndex()).getElement());
        xDist = currentItemMetrics.center.x - newItemMetrics.center.x;
        yDist = newItemMetrics.center.y - currentItemMetrics.bottom;

        angle = ((Math.atan2(xDist, yDist) * 180) / Math.PI) + 360;

        this.printDebugLine(this.calcDistance(xDist, yDist), (currentItemMetrics.center.x+5), currentItemMetrics.bottom, markerColor, angle);
    }

    if(focusableItem.getLeftFocusItemIndex() !== null) {
        newItemMetrics = this.getItemMetrics(this.getFocusableItem(focusableItem.getLeftFocusItemIndex()).getElement());
        xDist = newItemMetrics.center.x - currentItemMetrics.left;
        yDist = currentItemMetrics.center.y - newItemMetrics.center.y;

        angle = ((Math.atan2(xDist, yDist) * 180) / Math.PI) + 180;

        this.printDebugLine(this.calcDistance(xDist, yDist), currentItemMetrics.left, currentItemMetrics.center.y + 5, markerColor, angle);
    }

    if(focusableItem.getRightFocusItemIndex() !== null) {
        newItemMetrics = this.getItemMetrics(this.getFocusableItem(focusableItem.getRightFocusItemIndex()).getElement());
        xDist = newItemMetrics.center.x - currentItemMetrics.right;
        yDist = currentItemMetrics.center.y - newItemMetrics.center.y;

        angle = ((Math.atan2(xDist, yDist) * 180) / Math.PI) + 180;

        this.printDebugLine(this.calcDistance(xDist, yDist), currentItemMetrics.right, currentItemMetrics.center.y - 5, markerColor, angle);
    }
};

/**
 * Prints a single line for the given parameters
 * @function
 * @param {int} Length of line
 * @param {int} X Coordinate for starting the line
 * @param {int} Y Coordinate for starting the line
 * @param {Color} Color to draw the line
 * @param {int} Angle for the line to rotate around (in degrees)
 **/
FocusController.prototype.printDebugLine = function(length, startX, startY, color, angle) {
    'use strict';

    var lineElement = document.createElement('div');
    lineElement.classList.add('dpad-debug-line');
    lineElement.classList.add('marker');
    lineElement.classList.add('start');
    lineElement.style.position = 'absolute';
    lineElement.style.width = 5+'px';
    lineElement.style.height = length+'px';
    lineElement.style.left = startX+'px';
    lineElement.style.top = startY+'px';
    lineElement.style.backgroundColor = color;
    lineElement.style['-webkit-transform'] = 'rotate('+angle+'deg)';
    lineElement.style['-webkit-transform-origin'] = '0% 0%';
    document.body.appendChild(lineElement);
};

/**
 * Given an index, the focusable element at that index will
 * be given it's closest neighbours to traverse on left, right
 * up and down.
 * @function
 * @param {int} Index of element to update neighbours for
 **/
FocusController.prototype.updateNodeEdges = function(currentIndex) {
    'use strict';

    var currentItem = this.getFocusableItem(currentIndex);
    var currentItemMetrics = this.getItemMetrics(currentItem.getElement());

    var itemCount = this.getFocusableItemCount();

    var minTopElementDist;
    var minBottomElementDist;
    var minLeftElementDist;
    var minRightElementDist;

    if(this.isDebugMode() && currentItem.getElement().id === 'debug') {
        window.debug = true;
    } else {
        window.debug = false;
    }

    for(var i = 0; i < itemCount; i++) {
        var newItem = this.getFocusableItem(i);
        // If the element can't be focused, or is the current element,
        // skip it.
        if(!this.isFocusable(newItem.getElement()) || newItem === currentItem) {
            continue;
        }

        var newItemMetrics = this.getItemMetrics(newItem.getElement());
        var distanceTop = this.getTopDistance(currentItemMetrics, newItemMetrics);
        var distanceBottom = this.getBottomDistance(currentItemMetrics, newItemMetrics);
        var distanceLeft = this.getLeftDistance(currentItemMetrics, newItemMetrics);
        var distanceRight = this.getRightDistance(currentItemMetrics, newItemMetrics);

        if(window.debug) {
            console.log('New Element to Test: ', newItem.getElement());
            console.log('distanceTop: ', distanceTop);
            console.log('distanceBottom: ', distanceBottom);
            console.log('distanceLeft: ', distanceLeft);
            console.log('distanceRight: ', distanceRight);
        }

        if(distanceTop !== null && (typeof minTopElementDist === 'undefined' || minTopElementDist > distanceTop)) {
            minTopElementDist = distanceTop;

            currentItem.setTopFocusItemIndex(i);
        }

        if(distanceBottom !== null && (typeof minBottomElementDist === 'undefined' || minBottomElementDist > distanceBottom)) {
            minBottomElementDist = distanceBottom;

            currentItem.setBottomFocusItemIndex(i);
        }

        if(distanceLeft !== null && (typeof minLeftElementDist === 'undefined' || minLeftElementDist > distanceLeft)) {
            minLeftElementDist = distanceLeft;

            currentItem.setLeftFocusItemIndex(i);
        }

        if(distanceRight !== null && (typeof minRightElementDist === 'undefined' || minRightElementDist > distanceRight)) {
            minRightElementDist = distanceRight;

            currentItem.setRightFocusItemIndex(i);
        }
    }
};

FocusController.prototype.isFocusable = function(element) {
    'use strict';

    if(element.style.display === 'none' || element.style.visibility === 'hidden') {
        return false;
    }

    var tabIndex = element.getAttribute('tabindex');
    tabIndex = (tabIndex === null) ? -1 : tabIndex;
    return tabIndex > -1;
};

/**
 * Find the distance from the current elements (fromMetrics),
 * to the (toMetrics) element, if the element is in the up
 * direction.
 * @function
 * @param {Metrics} Starting elements metrics
 * @param {Metrics} Finishing elements metrics
 **/
FocusController.prototype.getTopDistance = function(fromMetrics, toMetrics) {
    'use strict';

    // Move Up
    var distance = {x: null, y: null};
    

    if (toMetrics.bottom <= fromMetrics.top) {
        distance.y = fromMetrics.center.y - toMetrics.center.y;
    }

    distance.left = Math.abs(fromMetrics.center.x - toMetrics.left);
    distance.right = Math.abs(fromMetrics.center.x - toMetrics.right);

    distance.x = Math.min(Math.abs(fromMetrics.center.x - toMetrics.left),
               Math.abs(fromMetrics.center.x - toMetrics.center.x),
               Math.abs(fromMetrics.center.x - toMetrics.right));

    if(distance.left === null || distance.right === null || distance.y === null) {
        return null;
    }

    var angleLeft = Math.atan(distance.y / distance.left) * (180/Math.PI);
    var angleRight = Math.atan(distance.y / distance.right) * (180/Math.PI);
    // If the angle is too shallow it's not really up
    if(window.debug) {
        console.log('Top Angle Left = '+angleLeft+' Right = '+angleRight);
    }
    if(!(angleLeft >= 0 && angleRight <= 180)) {
        return null;
    }

    return this.calcDistance(distance.x, distance.y);
};

/**
 * Find the distance from the current elements (fromMetrics),
 * to the (toMetrics) element, if the element is in the down
 * direction.
 * @function
 * @param {Metrics} Starting elements metrics
 * @param {Metrics} Finishing elements metrics
 **/
FocusController.prototype.getBottomDistance = function(fromMetrics, toMetrics) {
    'use strict';

    // Move Down
    var distance = {x: null, y: null};
    var directlyBelow = false;

    if (fromMetrics.bottom <= toMetrics.top) {
        distance.y = toMetrics.center.y - fromMetrics.center.y;
    }

    distance.left = Math.abs(fromMetrics.center.x - toMetrics.left);
    distance.right = Math.abs(fromMetrics.center.x - toMetrics.right);

    distance.x = Math.min(Math.abs(fromMetrics.center.x - toMetrics.left),
        Math.abs(fromMetrics.center.x - toMetrics.center.x),
         Math.abs(fromMetrics.center.x - toMetrics.right));

    if(distance.x === null || distance.y === null) {
        return null;
    }


    var angleLeft = Math.atan(distance.y / distance.left) * (180/Math.PI);
    var angleRight = Math.atan(distance.y / distance.right) * (180/Math.PI);
    // If the angle is too shallow it's not really up
    if(window.debug) {
        console.log('Bottom Angle Left = '+angleLeft+' Bottom = '+angleRight);
    }
    if(!(angleLeft >= 0 && angleRight <= 180)) {
        return null;
    }

    return this.calcDistance(distance.x, distance.y);
};

/**
 * Find the distance from the current elements (fromMetrics),
 * to the (toMetrics) element, if the element is in the left
 * direction.
 * @function
 * @param {Metrics} Starting elements metrics
 * @param {Metrics} Finishing elements metrics
 **/
FocusController.prototype.getLeftDistance = function(fromMetrics, toMetrics) {
    'use strict';

    // Move Left
    var distance = {x: null, y: null};
    if (toMetrics.right <= fromMetrics.left) {
        distance.x = fromMetrics.center.x - toMetrics.center.x;
    }

    distance.top = Math.abs(fromMetrics.center.y - toMetrics.top);
    distance.bottom = Math.abs(fromMetrics.center.y - toMetrics.bottom);

    distance.y = Math.min(
                    Math.abs(fromMetrics.center.y - toMetrics.top),
                    Math.abs(fromMetrics.center.y - toMetrics.center.y),
                    Math.abs(fromMetrics.center.y - toMetrics.bottom)
                );

    if(distance.x === null || distance.y === null) {
        return null;
    }

    var angleTop = Math.atan(distance.x / distance.top) * (180/Math.PI);
    var angleBottom = Math.atan(distance.x / distance.bottom) * (180/Math.PI);
    // If the angle is too shallow it's not really up
    if(window.debug) {
        console.log('Left Angle Top = '+angleTop+' Bottom = '+angleBottom);
    }
    if(!(angleTop >= 0 && angleBottom <= 180)) {
        return null;
    }

    return this.calcDistance(distance.x, distance.y);
};

/**
 * Find the distance from the current elements (fromMetrics),
 * to the (toMetrics) element, if the element is in the right
 * direction.
 * @function
 * @param {Metrics} Starting elements metrics
 * @param {Metrics} Finishing elements metrics
 **/
FocusController.prototype.getRightDistance = function(fromMetrics, toMetrics) {
    'use strict';

    // Move Right
    var distance = {x: null, y: null};

    if (fromMetrics.right <= toMetrics.left) {
        distance.x = toMetrics.center.x - fromMetrics.center.x;
    }

    distance.top = Math.abs(fromMetrics.center.y - toMetrics.top);
    distance.bottom = Math.abs(fromMetrics.center.y - toMetrics.bottom);

    distance.y = Math.min(Math.abs(fromMetrics.center.y - toMetrics.top),
               Math.abs(fromMetrics.center.y - toMetrics.center.y),
               Math.abs(fromMetrics.center.y - toMetrics.bottom)) * 2;

    if(distance.x === null || distance.y === null) {
        return null;
    }

    var angleTop = Math.atan(distance.x / distance.top) * (180/Math.PI);
    var angleBottom = Math.atan(distance.x / distance.bottom) * (180/Math.PI);
    // If the angle is too shallow it's not really up
    if(window.debug) {
        console.log('Right Angle Top = '+angleTop+' Bottom = '+angleBottom);
    }
    if(!(angleTop >= 0 && angleBottom <= 180)) {
        return null;
    }

    return this.calcDistance(distance.x, distance.y);
};

/**
 * Get the size and distance of the element relative 
 * to the viewport
 * @function
 * @param {DomElement} Element to get full metrics
 **/
FocusController.prototype.getItemMetrics = function(item) {
    'use strict';

    var clientRect = item.getBoundingClientRect();
    var metrics = {
        width: clientRect.width,
        height: clientRect.height,
        left: clientRect.left,
        right: clientRect.left + clientRect.width,
        top: clientRect.top,
        bottom: clientRect.top + clientRect.height,
        center: {
            x: clientRect.left + (clientRect.width / 2),
            y: clientRect.top + (clientRect.height / 2)
        }
    };

    return metrics;
};

/**
* On a key press this method will handle moving the focus
* @function
* @param {int} event Browser key code
*/
FocusController.prototype.onKeyDown = function (event) {
    'use strict';

    switch(event.keyCode) {
        case 9:
            // Tab
            break;
        case 37:
            // Left
            event.preventDefault();
            this.moveFocus({x: -1, y: 0});
            break;
        case 38:
            // Up
            event.preventDefault();
            this.moveFocus({x: 0, y: 1});
            break;
        case 39:
            // Right
            event.preventDefault();
            this.moveFocus({x: 1, y: 0});
            break;
        case 40:
            // Down
            event.preventDefault();
            this.moveFocus({x: 0, y: -1});
            break;
        case 13:
            // Enter
            event.preventDefault();
            if(this.getCurrentlyFocusedItem()) {
                this.getCurrentlyFocusedItem().onItemClickStateChange(true);
            }
            break;
    }
};

/**
* On a key press this method will handle moving the focus
* @function
* @param {int} event Browser key code
*/
FocusController.prototype.onKeyUp = function (event) {
    'use strict';

    switch(event.keyCode) {
        case 13:
            // Enter
            event.preventDefault();
            if(this.getCurrentlyFocusedItem()) {
                this.getCurrentlyFocusedItem().onItemClickStateChange(false);
            }
            break;
    }
};