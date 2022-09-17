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
	Script Name:     GPNTTextDecoder
	Script Purpose:  Decode an encoded byte array from the Griptonite Internal Text Format to a read-able strings.
	Script Creator:  Epicpkmn11, SuperSaiyajinStackZ
	Last Updated:    17. September 2022
	Version:         0.1
*/

export class GPNTTextDecoder {
	/* Private variables for this class. */
	#charTable;
	#encoding;

	/**
	 * The constructor of the GPNTTextDecoder class.
	 * 
	 * @param charT An array of the 16-bit CharTable of strings like "0x0168".
	 * @param enc   An object of keys and values like "0x21": "!".
	*/
	constructor(charT, enc) {
		this.#charTable = charT;
		this.#encoding  = enc;
	}

	/**
	 * Decode a byte array to a read-able string.
	 * 
	 * @param bytes The byte array to decode to a read-able string.
	 * 
	 * @returns the decoded string from the bytes array.
	 */
	decodeBytes(bytes) {
		let character = 0;
		let byte      = 0;
		let bit       = 0;
		let string    = "";
	
		do {
			character = 0x100; // Always 0x100 at the start of a new character.
	
			do {
				character = parseInt(this.#charTable[(character * 2) + ((bytes[byte] >> bit) & 1) - 0x200]);
				bit++;
	
				if (bit == 8) {
					bit = 0;
					byte++;
				}
			} while(character > 0xFF);
			
			if (character != 0x0) { // Don't push \0.
				if (this.#encoding.hasOwnProperty("0x" + character.toString(16).toUpperCase())) string += this.#encoding["0x" + character.toString(16).toUpperCase()];
			}
		} while(character != 0x0);
	
		return string;
	}
};