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
	Script Name:     GPNTTextEncoder
	Script Purpose:  Encode Strings back to the Griptonite Internal Text Format using an Encoding, CharTable and Strings JSON.
	Script Creator:  Epicpkmn11, SuperSaiyajinStackZ
	Last Updated:    17. September 2022
	Version:         0.1
	Additional Note: TODO - Figure out how the CharTable got generated, also support for Japanese, which uses 0xFXXX.
*/

export class GPNTTextEncoder {
	/* Private variables for this class. */
	#strings;
	#charTable;
	#encodingTable;

	/**
	 * The constructor of the GPNTTextEncoder class.
	 * 
	 * @param str   An array of strings.
	 * @param charT An array of the 16-bit CharTable of strings like "0x0168".
	 * @param enc   An object of keys and values like "0x21": "!".
	*/
	constructor(str, charT, enc) {
		this.#strings   = str
		this.#charTable = charT

		this.#encodingTable = [ ];

		/* Create a better encoding table. */
		for (let item in enc) this.#encodingTable[enc[item]] = item;
	}

	/**
	 * Credits to Epicpkmn11 for figuring out how to Encode that format!
	 * Encode a String to the original binary format.
	 * 
	 * @param string The string to encode to the Griptonite Text binary format.
	 * 
	 * @returns a byte array of the encoded string.
	 */
	encodeString(string) {
		let character = 0;
		let byte      = 0;
		let bitIdx    = 0;
		let out       = [ ];
		string       += "\0"; // Append a NULL Terminator to ensure it doesn't break.
	
		for (let char of string) {
			let bits = [ ];

			character = this.#encodingTable[char];
	
			do {
				/*
					Check everything in the table for if [tableChar * 2 - 0x200] or
					[tableChar * 2 + 1 - 0x200] matches our current character.
				*/
				for (let tableChar of this.#charTable) {
					tableChar = parseInt(tableChar);

					if (parseInt(this.#charTable[tableChar * 2 - 0x200]) == character || parseInt(this.#charTable[tableChar * 2 + 1 - 0x200]) == character) {
						/* If +1 matched, then this bit is set. */
						bits.push(parseInt(this.#charTable[tableChar * 2 + 1 - 0x200]) == character);
						character = tableChar;
						break;
					}
				}
			} while(character != 0x100); // All characters start with 0x100 => thus end encoding at 0x100.
	
			/*
				We now have an array of all the bits, they're backwards so reverse the array
				(could also just loop from the end to the start).
			*/
			bits.reverse();
			for (let bit of bits) {
				byte |= bit << bitIdx; // Note that bitIdx and byte are higher scope, they carry over between chars.
				bitIdx++;

				/* For each byte push it to the output array. */
				if (bitIdx == 8) {
					out.push(byte);
					byte   = 0;
					bitIdx = 0;
					
				}
			}
		}
	
		/* We may have an incomplete byte left, don't forget about it. */
		if (bitIdx != 0) out.push(byte);
		return out;
	}

	/**
	 * Create the Griptonite Text Binary and output it's data as an Uint8Array.
	 * 
	 * @returns an Uint8Array with the data of the Griptonite Text binary.
	 */
	createGPNTText() {
		/* Get the data offset table start and the table of the string data bytes. */
		const offsStart = 0x4 + (this.#charTable.length * 2);
		const dataBytes = this.encodeAll(); // Encode the strings to bytes.
		let   offsets   = [ ];


		/*
			Push the data table offsets.

			If the index is 0, get the base through:
			    - (table offset start) + (amount of strings * 4, as the offsets are 4 bytes per string).

			If the index is 1+, get the base through:
			    - (last index string start) + (last index string data size).
		*/
		for (let idx = 0; idx < dataBytes.length; idx++) {
			offsets.push((idx > 0 ? (offsets[idx - 1] + dataBytes[idx - 1].length) : offsStart + (dataBytes.length * 4)));
		}


		/*
			Now create a buffer in the proper size of our data.

			The full size can be get through the last string data's offset + it's length.
		*/
		const dataSize = offsets[offsets.length - 1] + dataBytes[offsets.length - 1].length;
		let   data     = new Uint8Array(dataSize);
		let   view     = new DataView(data.buffer);

		/* Write the offset of the string data offset table at 0x0. */
		view.setUint32(0x0, offsStart, true);

		/* Now the CharTable starting at 0x4. */
		for (let idx = 0; idx < this.#charTable.length; idx++) {
			view.setUint16(0x4 + (idx * 2), parseInt(this.#charTable[idx]), true);
		}

		/* Now the string data offsets. */
		for (let idx = 0; idx < offsets.length; idx++) {
			view.setUint32(offsStart + (idx * 4), offsets[idx], true);
		}

		/* Now the string encoded data. */
		for (let string = 0; string < dataBytes.length; string++) {
			for (let byteIdx = 0; byteIdx < dataBytes[string].length; byteIdx++) {
				view.setUint8(offsets[string] + byteIdx, dataBytes[string][byteIdx]);
			}
		}

		return data;
	}

	/**
	 * Encode all the Strings.
	 * 
	 * @returns an Array which contains an array per string with it's encoded bytes.
	 */
	encodeAll() {
		let output = [ ];
		for (let idx = 0; idx < this.#strings.length; idx++) output.push(this.encodeString(this.#strings[idx]));
		return output;
	}
};