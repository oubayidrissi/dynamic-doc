module.exports = (i, utilities) => {
    const { handleError, types, isp } = utilities;
    const getPage = () => utilities.page;

    return {
        /**
         * Utility to type into an input field using Xpath selectors.
         * 
         * @param {String} xpathExpression  - The Xpath selector.
         * @param {String} text             - The text to type into the field.
         */
        typeTextByXpath: async (xpathExpression, text) => {
            try {
                await utilities.typeText({ selector: xpathExpression, type: types.xpath }, text);
            } catch (error) {
                const type = types.xpath;
                handleError(i, error, null, { xpathExpression, type, text });
            }
        },

        /**
         * Utility to press enter button.
         */
        keyPress: async ({ selector, type = 'selector' }, keyButton) => {
            try {
                const page = getPage();
                
                const element = await utilities.getElement({ selector, type });
                if (!element)
                    throw new Error(`Element with ${type === types.selector ? 'Selector' : 'XPath'} selector '${selector}' not found`);

                await element.focus();
                await page.keyboard.press(keyButton);
            } catch (error) {
                handleError(i, error, 'keyPress');
            }
        },

        /**
         * Utility to type into an input field using Selector selectors.
         * 
         * @param {String} selectorExpression   - The Selector selector.
         * @param {String} text                 - The text to type into the field.
         */
        typeTextBySelector: async (selectorExpression, text) => {
            try {
                await utilities.typeText({ selector: selectorExpression, type: types.selector }, text);
            } catch (error) {
                const type = types.selector;
                handleError(i, error, null, { selectorExpression, type, text });
            }
        },

        /**
         * Utility to type into an input field using either Selector or XPath selectors.
         * 
         * @param {String} selector            - The Selector or XPath selector.
         * @param {String} [type = 'selector'] - The type of selector ('selector' or 'xpath').
         * @param {String} text                - The text to type into the field.
         * @param {Object} frame               - Frame page.
         */
        typeText: async ({ selector, type = 'selector' }, text, frame = null) => {
            try {
                const page = frame ?? getPage();
                const element = await utilities.getElement({ selector, type }, page);
                if (!element)
                    throw new Error(`Element with ${type === types.selector ? 'Selector' : 'XPath'} selector '${selector}' not found`);

                // Focus To Element
                await element.focus();

                // Function to ensure the element stays focused
                const ensureFocus = async () => {
                    const isFocused = await page.evaluate(el => document.activeElement === el, element);
                    if (!isFocused) await element.focus();
                };

                text = text ? text.toString() : "";
                const lines = text.split("\n");
                for (let line of lines) {
                    for (let char of line) {
                        // Check if the element is still focused
                        await ensureFocus();

                        // Type character with a slight random delay
                        await element.type(char, { delay: utilities.Helpers.randomNumber(1, 2) });
                    }

                    if (line !== lines[lines.length - 1])
                        await element.press('Enter');
                }
            } catch (error) {
                handleError(i, error, null, { selector, type, text });
            }
        },

        /**
         * Utility to click an element using XPath selector.
         * Prevent race condition by setting up navigation detection ahead of time. 
         * 
         * @param {String} xpathExpression - The Xpath selector.
         */
        clickElementByXpath: async (xpathExpression) => {
            try {
                await utilities.clickElement({selector: xpathExpression, type: types.xpath});
            } catch (error) {
                const type = types.xpath;
                handleError(i, error, null, { xpathExpression, type });
            }
        },

        /**
         * Utility to click an element using Selector selectors.
         * Prevent race condition by setting up navigation detection ahead of time. 
         * 
         * @param {String} selectorExpression - The Selector selector.
         */
        clickElementBySelector: async (selectorExpression) => {
            try {
                await utilities.clickElement({selector: selectorExpression, type: types.selector});
            } catch (error) {
                const type = types.selector;
                handleError(i, error, null, { selectorExpression, type });
            }
        },

        /**
         * Navigation handler for Hotmail.
         */
        handleHotmailNavigation: async (page, element, SETTLE_TIMEOUT=10000) => {
            const NAVIGATION_RECHECK_DELAY = 1000;
            const NAVIGATION_WAIT_TIMEOUT = 10000;
            //const SETTLE_TIMEOUT = 10000;

            let lastNavigationTime = Date.now();
            let navigationResolving = false;
            let lastLoggedFrameID = null;

            const navigationHandler = async (frame) => {
                lastNavigationTime = Date.now();

                const currentFrameLog = `Frame navigated: Frame ID = ${frame._id}`;
                
                if (lastLoggedFrameID !== currentFrameLog) {
                    await utilities.logMessage(currentFrameLog, null, true);
                    lastLoggedFrameID = currentFrameLog; // Update last logged frame
                }

                if (!navigationResolving) {
                    navigationResolving = true;
                    try {
                        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: NAVIGATION_WAIT_TIMEOUT }).catch(() => {});
                    } finally {
                        navigationResolving = false;
                    }
                }
            };

            page.on('framenavigated', navigationHandler);

            await element.click();
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: NAVIGATION_WAIT_TIMEOUT }).catch(() => {});

            await new Promise((resolve) => {
                const checkStability = () => {
                    const timeSinceLastNavigation = Date.now() - lastNavigationTime;

                    if (!navigationResolving && timeSinceLastNavigation > SETTLE_TIMEOUT) {
                        resolve();
                    } else {
                        setTimeout(checkStability, NAVIGATION_RECHECK_DELAY);
                    }
                };
                checkStability();
            });

            await utilities.logMessage(`Navigation Completed.`, null, true);
            page.off('framenavigated', navigationHandler);
        },

        /**
         * Navigation handler for Gmail.
         */
        handleGmailNavigation: async (page, element) => {
            const NAVIGATION_WAIT_TIMEOUT = 5000;
            const RECHECK_INTERVAL = 1500;
            let navigationResolving = false;
            let lastLoggedFrameID = null;

            const navigationHandler = async (frame) => { 
                const currentFrameLog = `Frame navigated: Frame ID = ${frame._id}`;
                
                if (lastLoggedFrameID !== currentFrameLog) {
                    await utilities.logMessage(currentFrameLog, null, true);
                    lastLoggedFrameID = currentFrameLog; // Update last logged frame
                }

                if (!navigationResolving) {
                    navigationResolving = true;
                    try {
                        await new Promise((resolve) => setTimeout(resolve, 1000));
                        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 3000 }).catch(() => {});
                    } finally {
                        navigationResolving = false;
                    }
                }
            };

            page.on('framenavigated', navigationHandler);

            await element.click();
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: NAVIGATION_WAIT_TIMEOUT }).catch(() => {});

            await new Promise((resolve) => {
                const interval = setInterval(() => {
                    if (!navigationResolving) {
                        clearInterval(interval);
                        resolve();
                    }
                }, RECHECK_INTERVAL);
            });

            await utilities.logMessage(`Navigation Completed.`, null, true);
            page.off('framenavigated', navigationHandler);
        },

        /**
         * Utility to click an element using either Selector or XPath selectors.
         * Prevent race condition by setting up navigation detection ahead of time. 
         * 
         * @param {String} selector             - The Selector or XPath selector.
         * @param {String} [type = 'selector']  - The type of selector ('selector' or 'xpath').
         * @param {Object} frame                - Frame page.
         */
        clickElement: async ({ selector, type = 'selector' }, frame = null, SETTLE_TIMEOUT=10000) => {
            try {
                const page = frame ?? getPage();
                const element = await utilities.getElement({ selector, type }, page);
                if (!element) {
                    throw new Error(`Element with ${type === types.selector ? 'Selector' : 'XPath'} selector '${selector}' not found`);
                }

                if (isp === 'hotmail') {
                    await utilities.handleHotmailNavigation(page, element, SETTLE_TIMEOUT);
                } else if (isp === 'gmail') {
                    await utilities.handleGmailNavigation(page, element);
                }

                //await utilities.logMessage(`Navigation Completed.`, null, true);
            } catch (error) {
                handleError(i, error, null, { selector, type });
            }
        },

        /**
         * This function can clear input value
         * 
         * @param {String} selectorExpression - The Selector selector.
         */
        clearInputBySelector: async (selectorExpression) => {
            try {
                await utilities.clearInput({selector: selectorExpression, type: types.selector});
            } catch (error) {
                const type = types.selector;
                handleError(i, error, null, { selectorExpression, type });
            }
        },

        /**
         * This function can clear input value
         * 
         * @param {String} xpathExpression - The Xpath selector.
         */
        clearInputByXpath: async (xpathExpression) => {
            try {
                await utilities.clearInput({selector: xpathExpression, type: types.xpath});
            } catch (error) {
                const type = types.xpath;
                handleError(i, error, null, { selectorExpression, type });
            }
        },

        /**
         * This function can clear input value
         * 
         * @param {String} selector            - The Selector or XPath selector.
         * @param {String} [type = 'selector'] - The type of selector ('selector' or 'xpath').
         * @param {Object} frame               - Frame page.
         */
        clearInput: async ({ selector, type = types.selector }, frame = null) => {
            try {
                const element = await utilities.getElement({ selector, type }, frame);
                if (!element) {
                    throw new Error(`Element with ${type === types.selector ? 'Selector' : 'XPath'} selector '${selector}' not found`);
                }

                const random = utilities.Helpers.randomNumber(3, 6);
                await element.click({ clickCount: random });

                await utilities.randomWait();
                await element.press('Backspace');
            } catch (error) {
                handleError(i, error, null, { selector, type });
            }
        },

        /**
         * Selects an option from a dropdown menu by its value.
         *
         * This function uses Puppeteer's `page.select()` method to select an option in a 
         * dropdown element. It accepts either a CSS selector or an XPath to locate the 
         * dropdown and selects the desired option based on the provided value.
         *
         * @param {Object} params                   - The parameters object.
         * @param {string} params.selector          - The CSS selector or XPath of the dropdown element.
         * @param {string} [params.type='selector'] - The type of selector used ('selector' or 'xpath').
         * @param {string} optionValue              - The value of the option to be selected.
         * @throws {Error} If the dropdown is not found or the selection fails.
         * @example
         * // Select an option by value using a CSS selector
         * await utilities.selectOption({
         *     selector: '#dropdown-id',
         *     type: 'selector'
         * }, 'option-value');
         *
         * // Select an option by value using an XPath
         * await utilities.selectOption({
         *     selector: '//select[@id="dropdown-id"]',
         *     type: 'xpath'
         * }, 'option-value');
         */
        selectOption: async ({ selector, type = 'selector' }, optionValue) => {
            try {
                const page = getPage();

                // Check the type of selector and perform the action
                if (type === 'selector') {
                    await page.select(selector, optionValue);
                } else if (type === 'xpath') {
                    // Find the dropdown element using XPath
                    const [elementHandle] = await page.$x(selector);
                    if (!elementHandle) {
                        throw new Error(`Dropdown with XPath '${selector}' not found.`);
                    }

                    // Get the 'name' attribute or unique identifier for selection
                    const dropdownSelector = await elementHandle.evaluate(el => el.name || el.id || el.className);
                    await page.select(`[name="${dropdownSelector}"]`, optionValue);
                } else {
                    throw new Error(`Unsupported selector type: ${type}. Expected 'selector' or 'xpath'.`);
                }

                // Log success message
                await utilities.logMessage(`Successfully selected option with value '${optionValue}' from dropdown.`);
            } catch (error) {
                // Handle and log the error
                utilities.handleError(i, error, null, { selector, type, optionValue });
            }
        },

        /**
         * Utility to click an element using either Selector or XPath selectors.
         * Prevent race condition by setting up navigation detection ahead of time. 
         * 
         * @param {String} selector         - The Selector or XPath selector.
         * @param {String} [type = 'selector']   - The type of selector ('selector' or 'xpath').
         */
        scrollToBottomPage: async () => {
            try {
                const page = getPage();

                await page.evaluate(async () => {
                    const distance = 100; // scroll distance per step in pixels
                    const delay = 100; // delay between each scroll step in milliseconds

                    while (document.scrollingElement.scrollTop + window.innerHeight < document.scrollingElement.scrollHeight) {
                        document.scrollingElement.scrollBy(0, distance);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                });
            } catch (error) {
                handleError(i, error);
            }
        },

        /**
         * Scrolls the page randomly.
         *
         * Performing random scrolling within the page for a specified duration and speed.
         *
         * @param {number} [maxScrollingTime=60000] - Maximum scrolling duration in milliseconds.
         * @param {number} [minScrollingTime=30000] - Minimum scrolling duration in milliseconds.
         * @param {number} [maxScrollingSpeed=3000] - Maximum scrolling speed delay in milliseconds.
         * @param {number} [minScrollingSpeed=500] - Minimum scrolling speed delay in milliseconds.
         *
         * @example
         * Randomly scroll the page using default parameter values
         * await WP.randomScroll(10000, 5000, 3000, 500);
         */
        randomScroll: async ( maxScrollingTime = 60000, minScrollingTime = 30000, maxScrollingSpeed = 3000, minScrollingSpeed = 500) => {
            try {
                const page = getPage();

                if (minScrollingTime > maxScrollingTime)
                    [ minScrollingTime, maxScrollingTime ] = [ maxScrollingTime, minScrollingTime ];

                if (minScrollingSpeed > maxScrollingSpeed)
                    [ minScrollingSpeed, maxScrollingSpeed ] = [ maxScrollingSpeed, minScrollingSpeed ];

                const endTime = Date.now() + Math.random() * (maxScrollingTime - minScrollingTime) + minScrollingTime;
                await page.evaluate(async (maxScrollingSpeed, minScrollingSpeed, endTime) => {
                    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
                    while (Date.now() < endTime) {
                        const scrollDownProbability = 0.75;
                        const isScrollDown = Math.random() < scrollDownProbability;

                        const randomScrollAmount =
                        Math.floor(Math.random() * (550 - 300 + 1)) + 300;
                        const scrollAmount = isScrollDown
                            ? randomScrollAmount
                            : -randomScrollAmount;

                        const newScrollPosition = window.scrollY + scrollAmount;
                        window.scrollTo(0, Math.max(0, newScrollPosition));

                        const randomDelay = Math.random() * (maxScrollingSpeed - minScrollingSpeed) + minScrollingSpeed;
                        await delay(randomDelay);
                    } }, maxScrollingSpeed, minScrollingSpeed, endTime
                );

                await utilities.randomWait();
            } catch (error) {
                handleError(i, error);
            }
        },

        /**
         * Randomly scrolls the page to an element.
         *
         * @param {Object|null} element - The target element to scroll to.
         * @param {string} element.selector - The selector of the target element (e.g., CSS selector or XPath).
         * @param {string} element.type - The type of selector, either 'css' for CSS selectors or 'xpath' for XPath.
         * @param {number} [maxScrollingTime=5000] - Maximum scrolling duration in milliseconds.
         * @param {number} [minScrollingTime=3000] - Minimum scrolling duration in milliseconds.
         * @param {number} [maxScrollingSpeed=900] - Maximum scrolling speed delay in milliseconds.
         * @param {number} [minScrollingSpeed=500] - Minimum scrolling speed delay in milliseconds.
         * @param {number} [offset=500] - Adjust scroll position relative to target element
         *
         * @example
         * Scroll to a specific element using XPath and other default parameter values
         * 
         * const targetElement = {
         *   selector: 'Element To Scroll',
         *   type: 'type of selector',
         * };
         * 
         * await WP.scrollToElement(targetElement, undefined, undefined, undefined, undefined, undefined, i);
         *
         */
        scrollToElement: async ( element, maxScrollingTime = 5000, minScrollingTime = 3000, maxScrollingSpeed = 900, minScrollingSpeed = 500, offset = 500 ) => {
            try {
                const page = getPage();
                
                if (minScrollingTime > maxScrollingTime)
                    [ minScrollingTime, maxScrollingTime ] = [ maxScrollingTime, minScrollingTime ];

                if (minScrollingSpeed > maxScrollingSpeed)
                    [ minScrollingSpeed, maxScrollingSpeed ] = [ maxScrollingSpeed, minScrollingSpeed ];

                const endTime = Date.now() + Math.random() * (maxScrollingTime - minScrollingTime) + minScrollingTime;
                const targetElement = await utilities.checkElement(element);
                if (targetElement) {
                    await page.evaluate(async ( selector, type, maxScrollingSpeed, minScrollingSpeed, offset, endTime ) => {
                        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
                        let el;
                        if (type === "xpath")
                            el = document.evaluate( selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null ).singleNodeValue; 
                        else
                            el = document.querySelector(selector);

                        if (el) {
                            const rect = el.getBoundingClientRect();
                            const targetPosition = rect.top;

                            const initialScrollOffset = targetPosition - offset;
                            window.scrollTo(0, initialScrollOffset);
                            await delay(1500);

                            while (Date.now() < endTime) {
                                const randomScrollAmount =
                                Math.floor(Math.random() * (550 - 400 + 1)) + 400;
                                const newScrollPosition =
                                initialScrollOffset + randomScrollAmount;
                                window.scrollTo(0, newScrollPosition);

                                const randomDelay =
                                Math.random() * (maxScrollingSpeed - minScrollingSpeed) +
                                minScrollingSpeed;
                                await delay(randomDelay);
                            }

                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    }, element.selector, element.type, offset, maxScrollingSpeed, minScrollingSpeed, endTime);
                } else {
                    await utilities.logMessage("Failed to locate element");
                    await utilities.randomScroll(10000, 6000, 2000, null);
                }
            } catch (error) {
                handleError(i, error);
            }
        },
    };
};