module.exports = (i, utilities) => {
    const { handleError, types } = utilities;
    const getPage = () => utilities.page;

    return {
        /**
         * Executes a given JavaScript callback in the context of the specified page.
         * 
         * This allows users to run arbitrary JavaScript code on the webpage 
         * represented by the Puppeteer `page` object. It captures the result of the 
         * callback execution and handles any errors that may occur during the process.
         * 
         * @param {Function} callback       - The JavaScript to execute.
         * @param {Array} arg               - Array of element to work with inside evaluate function.
         * @returns {Promise<*>}            - Resolves to the result of the callback, or null if undefined or an error occurs.
         */
        fetchDOM: async (callback, ...args) => {
            try {
                const page = getPage();
                const result = await page.evaluate(callback, ...args);
                return result !== undefined ? result : null;
            } catch (error) {
                handleError(i, error);
            }
        },

        /**
         * Checks if a specified element by Xpath exists on the page.
         *
         * @param {string} xpathExpression  - The Xpath selector of the element.
         * @returns {Boolean}               - Resolves to true if the element exists on the page, otherwise false.
         * @throws {Error}                  - Throws an error if the elementInfo is invalid.
         */
        checkElementByXpath: async (xpathExpression) => {
            try {
                return await utilities.checkElement({selector: xpathExpression, type: types.xpath});
            } catch (error) {
                const type = types.xpath;
                handleError(i, error, null, { xpathExpression, type });
            }
        },

        /**
         * Checks if a specified element by Selector exists on the page.
         *
         * @param {string} selectorExpression   - The Selector selector of the element.
         * @returns {Boolean}          - Resolves to true if the element exists on the page, otherwise false.
         * @throws {Error}                      - Throws an error if the elementInfo is invalid.
         */
        checkElementBySelector: async (selectorExpression) => {
            try {
                return await utilities.checkElement({selector: selectorExpression, type: types.selector});
            } catch (error) {
                const type = types.selector;
                handleError(i, error, null, { selectorExpression, type });
            }
        },

        /**
         * Checks if a specified element exists on the page.
         *
         * @param {string} selector         - The Selector or XPath selector of the element.
         * @param {string} [type = 'selector']   - The type of the selector ('selector' or 'xpath').
         * @returns {Promise<boolean>}      - Resolves to true if the element exists on the page, otherwise false.
         * @throws {Error}                  - Throws an error if the elementInfo is invalid.
         */
        checkElement: async ({ selector, type = 'selector' }) => {
            try {
                const page = getPage();
                let exists = false;

                if (type == types.selector)
                    exists = await page.$(selector) !== null;

                else if (type == types.xpath) {
                    // exists = (await page.$x(selector)).length > 0;
                    exists = await page.evaluate((xpath) => {
                        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                        return result.singleNodeValue;
                    }, selector) !== null;
                }

                else
                    throw new Error(`Unsupported selector type: ${type}. Expected 'selector' or 'xpath'.`);

                return exists;
            } catch (error) {
                handleError(i, error, null, { selector, type });
            }
        },

        /**
         * Retrieves an element from the page based on a specified selector and type.
         *
         * @param {string} selector          - The selector of the element.
         * @param {string} [type = 'selector']    - The type of the selector ('selector', 'xpath', 'id', 'class').
         * @returns {Promise<Element>|null}  - Resolves to the element if found, otherwise null.
         * @throws {Error}                   - Throws an error if the selector type is unsupported.
         */
        getElement: async ({ selector, type = 'selector' }, frame = null) => {
            try {
                const page = frame ?? getPage();
                let element;

                switch (type) {
                    case 'id':
                        element = await page.$(`[id="${selector}"]`);
                        break;
                    case 'selector':
                        element = await page.$(selector);
                        break;
                    case 'xpath':
                        const elementHandle = await page.evaluateHandle((xpath) => {
                            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                            return result.singleNodeValue;
                        }, selector);
                        element = elementHandle.asElement();
                        break;
                    case 'class':
                        element = await page.$(`.${selector}`);
                        break;
                    case 'allSelector':
                        element = await page.$$(selector);
                        break;
                    case 'allXpath':
                        const elements = await page.evaluateHandle((xpath) => {
                            const results = [];
                            const iterator = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
                            let node = iterator.iterateNext();
                            while (node) {
                                results.push(node.outerHTML); // Or any other property you need
                                node = iterator.iterateNext();
                            }
                            return results;
                        }, selector);

                        // Convert DOM nodes to Puppeteer ElementHandles
                        element = await elements.evaluate((nodes) => 
                            nodes.map(node => node)
                        );

                        element = elements;
                        break;
                    default:
                        throw new Error(`Unsupported selector type: ${type}.`);
                }

                return element || null;
            } catch (error) {
                handleError(i, error, null, { selector, type });
            }
        },

        /**
         * Retrieves a specified attribute from an element on the page.
         *
         * @param {string} selector         - The Selector or XPath selector of the element.
         * @param {string} [type = 'selector']   - The type of the selector ('selector', 'xpath', 'id', or 'class').
         * @param {string} attribute        - The name of the attribute to retrieve ('name', 'value', 'href', 'innerText', or 'innerHTML') or custom attribute.
         * @returns {Promise<string|null>}  - Resolves to the value of the specified attribute or null if not found.
         * @throws {Error}                  - Throws an error if the elementInfo is invalid or the attribute is unsupported.
         */
        getAttribute: async ({ selector, type = 'selector' }, attribute) => {
            try {
                const element = await utilities.getElement({ selector, type });
                if (!element) {
                    throw new Error(`No element found with selector: ${selector}`);
                }

                let result;
                switch (attribute) {
                    case 'name':
                        result = await element.evaluate(el => el?.name || null);
                        break;
                    case 'value':
                        result = await element.evaluate(el => el?.value || null);
                        break;
                    case 'href':
                        result = await element.evaluate(el => el?.href || null);
                        break;
                    case 'text':
                        result = await element.evaluate(el => el?.innerText || el.textContent || null);
                        break;
                    case 'html':
                        result = await element.evaluate(el => el?.innerHTML || null);
                        break;
                    default:
                        result = await element.evaluate((el, attr) => el?.getAttribute(attr) || null, attribute);
                }

                return result;
            } catch (error) {
                handleError(i, error, null, { selector, type, attribute });
            }
        },
    };
};
