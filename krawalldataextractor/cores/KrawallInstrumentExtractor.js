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
	Script Name:     Krawall Instrument Extractor
	Script Purpose:  Extracts the Instruments from the Krawall Sound Engine back to a similar format like Krawerter does. (https://github.com/sebknzl/krawall/tree/master/krawerter)
	Script Creator:  SuperSaiyajinStackZ
	Last Updated:    17. September 2022
	Version:         0.2
	Additional Note: You need to provide the Instrument Table Offset to make it work.
					 You can usually find the table by looking for the processRow function where it gets the instrument,
					 if the table has no valid ROM address pointers, then no instruments exist.
*/

/* ROM Range definitions. */
const romBase = 0x08000000; // ROM Base is at 08000000, so we'd do - 0x08000000 at the end to get the actual binary location for pointers.
const romEnd  = 0x09FFFFFF; // 0x09FFFFFF is the max offset a normal GBA ROM can go.

/* Define some useful offsets to work with. */
const volEnvNode   = 0xC0;
const volEnvSub    = 0xF0;
const panEnvNode   = 0xF4;
const panEnvSub    = 0x124;
const volFade      = 0x128;
const vibratoParms = 0x12A;
const instrPerLine = 0x8;


export class KrawallInstrumentExtractor {
	/* Private Variables. */
	#view;  // DataView instance.
	#table; // Instrument Pointer Table address.
	#count; // Amount of Instruments.

	/**
	 * Initialize some variables for this class.
	 * 
	 * @param view  A reference to an initialized DataView.
	 * @param table The Address to the Instrument Pointer table.
	*/
	constructor(view, table) {
		/* You can also pass null and the functionality for empty instrument data works too. */
		if (table == undefined || table == null) {
			this.#view  = view;
			this.#table = null;
			this.#count = 0;
			return;
		}

		this.#view   = view;
		this.#table  = table;
		this.#count  = 0;

		/* Get the proper Instruments Count. */
		do {
			const iAddr = this.#view.getUint32(this.#table + (this.#count * 0x4), true);

			/* If the Pointer is in ROM Section range, we have a proper instrument pointer. */
			if (iAddr >= romBase && iAddr <= romEnd) this.#count++;
			else break; // If it's not in the range then that usually means no more instruments available.
		} while(1);
	}


	/**
	 * Returns the count of the Instruments that was found.
	 * 
	 * @returns The amount of instruments that were found.
	 */
	instrumentCount() { return this.#count; }


	/**
	 * Extracts the instrIdx'd instrument.
	 * 
	 * @param instrIdx The index of the instrument from the instruments table.
	 * 
	 * @returns A string containing the assembly data for the Instrument.
	*/
	extractInstrument(instrIdx) {
		if (instrIdx >= this.#count) return ""; // Check for the count.

		/* Get bases to work with. */
		const addr   = this.#view.getUint32(this.#table + (instrIdx * 0x4), true) - romBase; // Get address we work on here.
		let instrOut = ".align\n@ ======================================================================\n@ \"Linstrument" + instrIdx.toString() + " (0x" + (addr + romBase).toString(16).toUpperCase().padStart(8, "0") + ")\"\n";
		instrOut    += "Linstrument" + instrIdx.toString() + ":\n"; // Define the Label Start.

		/* Get the Sample map. */
		instrOut += "@ samplemap\n.short ";
		for (let idx = 0; idx < 96; idx++) {
			instrOut += this.#view.getUint16(addr + (idx * 2), true).toString();
			if (idx < 95) instrOut += ", ";
		}

		/* Get the volume envelope. */
		instrOut += "\n@ vol-envelope\n.short ";
		for (let node = 0; node < 12; node++) {
			instrOut += this.#view.getUint16(addr + volEnvNode + (node * 4), true).toString() + ", " + this.#view.getUint16(addr + volEnvNode + (node * 4) + 2, true).toString();

			if (node < 11) instrOut += ", ";
		}
		instrOut += "\n.byte  " + this.#view.getUint8(addr + volEnvSub).toString() + ", "
								+ this.#view.getUint8(addr + volEnvSub + 1).toString() + ", "
								+ this.#view.getUint8(addr + volEnvSub + 2).toString() + ", "
								+ this.#view.getUint8(addr + volEnvSub + 3).toString() + "\n";

		/* Get the pan envelope. */
		instrOut += "@ pan-envelope\n.short ";
		for (let node = 0; node < 12; node++) {
			instrOut += this.#view.getUint16(addr + panEnvNode + (node * 4), true).toString() + ", " + this.#view.getUint16(addr + panEnvNode + (node * 4) + 2, true).toString();
						
			if (node < 11) instrOut += ", ";
		}	
		instrOut += "\n.byte  " + this.#view.getUint8(addr + panEnvSub).toString() + ", "
								+ this.#view.getUint8(addr + panEnvSub + 1).toString() + ", "
								+ this.#view.getUint8(addr + panEnvSub + 2).toString() + ", "
								+ this.#view.getUint8(addr + panEnvSub + 3).toString() + "\n";

		/* Get the volume fade. */
		instrOut += "@ volfade\n.short " + this.#view.getUint16(addr + volFade, true).toString() + "\n";

		/* Get the vibrato parms. */
		instrOut += "@ vibrato-parms\n.byte  ";
		instrOut += this.#view.getUint8(addr + vibratoParms).toString() + ", "
				 + this.#view.getUint8(addr + vibratoParms + 1).toString() + ", "
				 + this.#view.getUint8(addr + vibratoParms + 2).toString() + ", "
				 + this.#view.getUint8(addr + vibratoParms + 3).toString() + "\n";

		return instrOut;
	}

	/**
	 * Extracts all Instruments and creates the "instruments.S" file.
	 *
	 * @returns A string containing the assembly data for the instruments.
	 */
	extractInstruments() {
		if (this.#count <= 0) return ".global instruments\n.section .rodata\n\n.align\n\ninstruments:\n.word\n"; // Return empty instruments.

		let outdata = ".global instruments\n.section .rodata\n"; // The header.

		/* Extract the Instrument data. */
		for (let idx = 0; idx < this.#count; idx++) outdata += "\n" + this.extractInstrument(idx);

		/* Now here add the Instrument table. */
		outdata += "\n\n.align\ninstruments:\n.word ";

		for (let idx = 0, lineCount = 0; idx < this.#count; idx++) {
			outdata += "Linstrument" + idx.toString();
			lineCount++;

			if (idx < this.#count - 1) {
				/* 8 instruments reached, new line. */
				if (lineCount == instrPerLine) {
					lineCount = 0;
					outdata  += "\n.word ";

				/* Just add the comma separator for the next instrument. */
				} else {
					outdata += ", ";
				}
			}
		}

		outdata += "\n"; // Assembly files should usually be ended with a newline, so here we go.
		return outdata;
	}

	/**
	 * Creates an empty C-header.
	 * 
	 * @returns A string containing the C header data.
	 */
	#createHeaderEmpty() { return "#ifndef __INSTRUMENTS_H__\n#define __INSTRUMENTS_H__\n\n#endif"; }

	/**
	 * Creates the C-header file for the Instruments that you can use in your project.
	 * 
	 * @param includeCount if including the #define INSTRUMENTS_COUNT or not.
	 * 
	 * @returns A string containing the C header data.
	 */
	createHeader(includeCount) {
		if (this.#count <= 0) return this.#createHeaderEmpty();

		let   headerOut = "#ifndef __INSTRUMENTS_H__\n#define __INSTRUMENTS_H__\n\n"; // Define the Header Guards.
		const maxNumLen = Math.max(0, this.#count - 1).toString().length;

		if (includeCount != undefined && includeCount == true) {
			headerOut += "#define INSTRUMENTS_COUNT " + this.#count.toString() + "\n\n"; // Not available normally in Krawerter, but i find that a nice bonus definition.
		}
		
		/* Add the instrument definitions. */
		for (let idx = 0; idx < this.#count; idx++) headerOut += ("#define INSTRUMENTS_INSTRUMENT_" + idx.toString().padStart(maxNumLen, "0")) + " " + idx.toString() + "\n";
		
		/* End the Header Guard. */
		headerOut += "\n#endif";
		return headerOut;
	}
};