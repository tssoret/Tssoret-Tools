/*
*   This file is part of Tssoret-Tools
*   Copyright © 2022 tssoret
*
*   This program is free software: you can redistribute it and/or modify
*   it under the terms of the GNU General Public License as published by
*   the Free Software Foundation, either version 3 of the License, or
*   (at your option) any later version.
*
*   This program is distributed in the hope that it will be useful,
*   but WITHOUT ANY WARRANTY; without even the implied warranty of
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*   GNU General Public License for more details.
*
*   You should have received a copy of the GNU General Public License
*   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
*   Additional Terms 7.b and 7.c of GPLv3 apply to this file:
*       * Requiring preservation of specified reasonable legal notices or
*         author attributions in that material or in the Appropriate Legal
*         Notices displayed by works containing it.
*       * Prohibiting misrepresentation of the origin of that material,
*         or requiring that modified versions of such material be marked in
*         reasonable ways as different from the original version.
*/

/*
	Script Name:     GPNTTextParser
	Script Purpose:  Parse a Griptonite Text binary and return a list of all Decoded Strings and it's encoded bytes.
	Script Creator:  Epicpkmn11, SuperSaiyajinStackZ
	Last Updated:    17. September 2022
	Version:         0.1
*/

export class GPNTTextParser {
	/* Private variables for this class. */
	#gpnttext;
	#encoding;

	/**
	 * The constructor of the GPNTTextParser class.
	 * 
	 * @param gpnttext A DataView of the Griptonite Text binary.
	 * @param enc      An object of keys and values like "0x21": "!".
	*/
	constructor(gpnttext, enc) {
		this.#gpnttext = gpnttext;
		this.#encoding = enc;
	}

	/**
	 * Get the amount of strings from the Griptonite Text binary.
	 * 
	 * @returns the string amount of the Griptonite Text binary.
	 */
	stringCount() {
		const base        = this.#gpnttext.getUint32(0x0, true);  // String Offset base.
		const firstString = this.#gpnttext.getUint32(base, true); // First string data offset.

		return ((firstString - base) / 4) >> 0; // Divide by 4, as it's 4 bytes per offset and >> 0 to not result in a non-decimal value.
	}

	/**
	 * Get the start offset of the stringID's data.
	 * 
	 * @param stringID: The string ID from which to get the data start offset from.
	 * 
	 * @returns The start offset to the string ID's data.
	 */
	#stringOffs(stringID) {
		const base = this.#gpnttext.getUint32(0x0, true);  // String Offset base.

		return this.#gpnttext.getUint32(base + (stringID * 0x4), true);
	}

	/**
	 * Get the char's 16-bit value from the table.
	 * 
	 * @param char: The character to get from the table.
	 * 
	 * @returns The 16-bit value from the charTable.
	 */
	#charTable(char) {
		return this.#gpnttext.getUint16(0x4 + (char * 0x2), true);
	}

	/**
	 * Fetches a String's data.
	 * 
	 * @param stringID: The ID of the string to fetch.
	 * 
	 * @returns an object of the final string and an array of it's encoded bytes.
	 */
	fetchString(stringID) {
		let offs      = 0;
		let character = 0;
		let byte      = 0;
		let bit       = 0;
		let output    = {
			encoded: [ ],
			string: ""
		};

		/* Safety range checks. */
		if (stringID > this.stringCount() - 1) return output;

		/* Get the offset + the start byte. */
		offs = this.#stringOffs(stringID);
		byte = this.#gpnttext.getUint8(offs);

		/* Decode the String. */
		do {
			character = 0x100; // Always 0x100 at the start of a new character.
	
			do {
				character = this.#charTable((character * 2) + ((byte >> bit) & 1) - 0x200);
				bit++;
	
				if (bit == 8) {
					output.encoded.push(byte); // Push encoded byte.
					offs++;
					
					bit  = 0;
					byte = this.#gpnttext.getUint8(offs);
				}
			} while(character > 0xFF);
			
			if (character != 0x0) { // Don't push \0 for the string.
				if (this.#encoding.hasOwnProperty("0x" + character.toString(16).toUpperCase())) output.string += this.#encoding["0x" + character.toString(16).toUpperCase()];
			}
		} while(character != 0x0);

		/* That byte may be incomplete, hence push that byte as well if bit is not 0. */
		if (bit != 0) output.encoded.push(byte);
		return output;
	}
};