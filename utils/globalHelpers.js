// globalHelpers.js

const globalHelpers = {
    /**
     * Generate a random number between min and max (inclusive).
     * Automatically handles cases where min > max.
     */
    randomNumber: (min, max) => {
        if (min > max) [min, max] = [max, min]; // Ensure min <= max
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Generate a random string of the given length.
     * Uses a default set of alphanumeric characters.
     */
    randomString: (length) => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * Generate a strong password with random length between minLength and maxLength.
     * Includes uppercase, lowercase, numbers, and special characters.
     */
    generateStrongPassword: (minLength = 12, maxLength = 18) => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
        const length = globalHelpers.randomNumber(minLength, maxLength);
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * Generate a valid Gmail username based on provided first and last names.
     * Adds optional random suffix and randomly includes dots.
     */
    generateUsername: (firstName, lastName, username = null) => {
        const randomSuffix = globalHelpers.randomString(globalHelpers.randomNumber(3, 8)); // Length 3–8 for stronger uniqueness
        const randomNumber = Math.floor(Math.random() * 10000); // Random number (0–9999) for added uniqueness
        const usernameParts = [];
    
        // Handle null or empty firstName and lastName
        const sanitizedFirstName = firstName?.trim().toLowerCase() || '';
        const sanitizedLastName = lastName?.trim().toLowerCase() || '';
    
        // Check if both names are unavailable
        if (!sanitizedFirstName && !sanitizedLastName) {
            // Use provided username or fallback to randomSuffix + randomNumber
            if (username) {
                return username.toLowerCase().replace(/[^a-z0-9.]/g, ''); // Sanitize and return the provided username
            } else {
                return `${randomSuffix}${randomNumber}`; // Fallback to random username
            }
        }
    
        // Include sanitized firstName and/or lastName based on availability
        const includeFirstName = sanitizedFirstName && (Math.random() > 0.3 || !sanitizedLastName);
        const includeLastName = sanitizedLastName && (Math.random() > 0.3 || !sanitizedFirstName);
    
        if (includeFirstName) usernameParts.push(sanitizedFirstName);
        if (includeLastName) usernameParts.push(sanitizedLastName);
    
        // Insert randomSuffix randomly between, at the start, or at the end
        const insertSuffixAtStart = Math.random() > 0.5; // 50% chance to start with randomSuffix
        if (insertSuffixAtStart) usernameParts.unshift(randomSuffix);
        else usernameParts.push(randomSuffix);
    
        // Add a random number for uniqueness
        usernameParts.push(randomNumber);
    
        // Randomly place or omit the dot separator
        const includeDot = Math.random() > 0.5;
        let finalUsername = usernameParts.join(includeDot ? '.' : '');
    
        // Ensure username is at least 12 characters long
        while (finalUsername.length < 12) {
            finalUsername += globalHelpers.randomString(globalHelpers.randomNumber(2, 4)); // Append random characters
        }
    
        // Remove leading dots if they exist
        finalUsername = finalUsername.replace(/^\.+/, '');
    
        // Return the final username, sanitized for Gmail compatibility
        return finalUsername.replace(/[^a-z0-9.]/g, ''); // Ensure only valid characters
    },
    
    /**
     * Format a birthday object into "DD-MM-YYYY" format.
     * @param {Object} birthday - The birthday object with day, month, and year as strings.
     * @returns {string} - Formatted date in "DD-MM-YYYY" format.
     */
    formatBirthday: (birthday) => {
        const { day, month, year } = birthday;
        return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
    },

    /**
     * Get a random element from an array.
     * Throws an error if the input is not a non-empty array.
     * 
     * @param {Array} array - Array of elements.
     * @returns - Random element from the array.
     */
    getRandomFromArray: (array) => {
        /*console.log( "-----------------" );
        console.log( array );
        console.log( "-----------------" );*/

        if (!Array.isArray(array) || array.length === 0) {
            throw new Error('Input must be a non-empty array');
        }
        const randomIndex = Math.floor(Math.random() * array.length);
        return array[randomIndex];
    },

    /**
     * Find all reCAPTCHA clients on the current page.
     * @returns - Array of reCAPTCHA client objects with ID, version, sitekey, callback, and function.
     */
    findRecaptchaClients: () => {
        // eslint-disable-next-line camelcase
        if (typeof (___grecaptcha_cfg) !== 'undefined') {
            // eslint-disable-next-line camelcase, no-undef
            return Object.entries(___grecaptcha_cfg.clients).map(([cid, client]) => {
                const data = { id: cid, version: cid >= 10000 ? 'V3' : 'V2' };
                const objects = Object.entries(client).filter(([_, value]) => value && typeof value === 'object');

                objects.forEach(([toplevelKey, toplevel]) => {
                    const found = Object.entries(toplevel).find(([_, value]) => (
                        value && typeof value === 'object' && 'sitekey' in value && 'size' in value
                    ));

                    if (typeof toplevel === 'object' && toplevel instanceof HTMLElement && toplevel['tagName'] === 'DIV'){
                        data.pageurl = toplevel.baseURI;
                    }

                    if (found) {
                        const [sublevelKey, sublevel] = found;

                        data.sitekey = sublevel.sitekey;
                        const callbackKey = data.version === 'V2' ? 'callback' : 'promise-callback';
                        const callback = sublevel[callbackKey];
                        if (!callback) {
                            data.callback = null;
                            data.function = null;
                        } else {
                            data.function = callback;
                            const keys = [cid, toplevelKey, sublevelKey, callbackKey].map((key) => `['${key}']`).join('');
                            data.callback = `___grecaptcha_cfg.clients${keys}`;
                        }
                    }
                });

                return data;
            });
        }
        return [];
    },

    /**
     * Function can refactor message to handle text area input.
     * 
     * @param {String} body   - Message need to refactor.
     * @returns {Object} data - Object contain needed values.
     */
    refactorTextAreaMessage: (body, data) => {
        if (!body) return null;

        const { firstName, lastName, recipientName } = data;

        const replacements = {
            '\\n': '\n',
            '${Recipient_Name}': recipientName || '',
            '[Include the exciting news here]': '',
            '${Your_Name}': (firstName && lastName) ? `${firstName} ${lastName}` : ''
        };

        return Object.entries(replacements).reduce(
            (acc, [key, value]) => acc.replaceAll(key, value),
            body
        );
    },

    /**
     * Function can shuffle array.
     * 
     * @param {Array} array - Array u need to shuffle.
     * @returns {Array} - Shuffled array.
     */
    shuffleArrayHelper: (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const randomIndex = Math.floor(Math.random() * (i + 1)); // Pick a random index
            [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]]; // Swap elements
        }

        return shuffled;
    },

    /**
     * Tracking Date Format (Start Tracking Request)
     * @param {Date} date 
     * @returns {String} - Formatted date in "YYYY-MM-DDTHH:MM:SS.sssZ" format.
     * 
     * @example
     * trackingRequestDate(new Date());
     * => "2021-09-08T15:30:00.000Z"
     */
    trackingRequestDate: (date) => {
        var year = date.getUTCFullYear();
        var month = String(date.getUTCMonth() + 1).padStart(2, '0');
        var day = String(date.getUTCDate()).padStart(2, '0');
        var hours = String(date.getUTCHours()).padStart(2, '0');
        var minutes = String(date.getUTCMinutes()).padStart(2, '0');
        var seconds = String(date.getUTCSeconds()).padStart(2, '0');
        var milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

        // Adding the required precision for milliseconds
        var millisecondsWithPrecision = milliseconds + '3851'; // 3851 is the precision required

        // Getting the time zone offset in minutes and converting it to the required format
        var offset = date.getTimezoneOffset();
        var sign = offset < 0 ? '+' : '-';
        var absOffset = Math.abs(offset);
        var offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
        var offsetMinutes = String(absOffset % 60).padStart(2, '0');

        // Combine everything into the required format and return
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millisecondsWithPrecision}${sign}${offsetHours}:${offsetMinutes}`;
    },
};

module.exports = { Helpers: globalHelpers };