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
	Script Name:     Krawall Module Extractor
	Script Purpose:  Extracts the Modules from games using the Krawall Sound Engine back to a similar format like Krawerter does. (https://github.com/sebknzl/krawall/tree/master/krawerter)
	Script Creator:  SuperSaiyajinStackZ
	Last Updated:    22. December 2022
	Version:         0.2
	Additional Note: You have to provide the address to the Module by yourself, including a module name, like ModuleXX for example and the used Krawall Version.
					 There is no "Universal" way to detect where all modules are stored, so the best way is to check for references to krapPlay and see what gets passed in
					 as the first argument, which is a Module* pointer.
*/

/* ROM Range definitions. */
const romBase = 0x08000000; // ROM Base is at 08000000, so we'd do - 0x08000000 at the end to get the actual binary location for pointers.
const romEnd  = 0x09FFFFFF; // 0x09FFFFFF is the max offset a normal GBA ROM can go.

/* Define some useful offsets to work with. */
const channels         = 0x0;
const numOrders        = 0x1;
const songRestart      = 0x2;
const order            = 0x3;   // Table of 256.
const channelPan       = 0x103; // Table of 32.
const songIndex        = 0x123; // Table of 64.
const volGlobal        = 0x163;
const initSpeed        = 0x164;
const initBPM          = 0x165;
const flagInstrBased   = 0x166;
const flagLinearSlides = 0x167;
const flagVolSlides    = 0x168;
const flagVolOpt       = 0x169;
const flagAmigaLimits  = 0x16A;
const padding          = 0x16B; // Literally 1 byte 0 padding, so it matches the 4 byte offsets.
const patternTable     = 0x16C;

/* Here for the Pattern. */
const patternRows      = 0x20;
const patternData2003  = 0x21; // < 2004-07-07 uses 8 bits for patternRows.
const patternData2004  = 0x22; // >= 2004-07-07 uses 16 bits for patternRows.
const dataPerLine      = 0x40; // 64 bytes per line.
const patternPerLine   = 0x8;  // 8 pattern per line.


/**
 * A small helper function to check for valid Header Guard characters.
 * Only allow 0 - 9, A - Z, a - z and _.
 * 
 * @param c The character to check.
 * 
 * @returns if c is valid.
 */
function checkHeaderValidate(c) {
	return (c >= "0" && c <= "9") || (c >= "A" && c <= "Z") || (c >= "a" && c <= "z") || c == "_";
}

export class KrawallModuleExtractor {
	/* Private Variables. */
	#view;         // DataView instance.
	#patternCount; // Amount of Pattern.
	#modOffs;      // Module address.
	#modGuardName; // Module Header Guard name.
	#modName;      // Module base Name.
	#ver;          // Krawall version.

	/**
	 * Initialize some variables for this class.
	 * 
	 * @param view       A reference to an initialized DataView.
	 * @param moduleOffs The Address to the Module.
	 * @param moduleName The name of the Module. Use ModuleXX or so, if you are unsure about the name.
	 * @param ver        The version of Krawall that is being used as a string with "YEAR-MONTH-DAY".
	 */
	constructor(view, moduleOffs, moduleName, ver) {
		this.#view = view;

		/* check the version string of Krawall. */
		switch(ver) {
			/* The 2003 version is not compatible with all the others, because the pattern format is different and the bit size for the rows. */
			case "2003-03-19":
			case "2003-09-01":
				this.#ver = 1;
				break;

			/* All of these are compatible with each other i think, but not with the 2003 version. */
			case "2004-07-07":
			case "2004-09-17":
			case "2004-11-14":
			case "2005-04-21":
				this.#ver = 2;
				break;

			/* No version provided, so don't do anything. */
			default:
				this.#ver = 0;
				break;
		}

		this.setModule(moduleOffs, moduleName);
	}


	/**
	 * Use this, if you want to change the Module Offset and it's name.
	 * 
	 * @param moduleOffs The offset to the Module.
	 * @param moduleName The name of the Module.
	 */
	setModule(moduleOffs, moduleName) {
		this.#patternCount = 0;
		this.#modOffs      = moduleOffs;

		if (this.#ver == 0) return;

		/* Get the amount of Patterns. There likely may be a better way, but this seems to work alright too. */
		do {
			const pAddr = this.#view.getUint32(this.#modOffs + patternTable + (this.#patternCount * 0x4), true);

			/* If the Pointer is in ROM Section range, we have a proper Pattern pointer. */
			if (pAddr >= romBase && pAddr <= romEnd) this.#patternCount++;
			else break; // If it's not in the range then that usually means no more Patterns available.
		} while(1);

		/* Setup the Module names for the assembly / header data. */
		this.#modGuardName = "__MODULE_", this.#modName = "";

		for (let idx = 0; idx < moduleName.length; idx++) {
			if (checkHeaderValidate(moduleName[idx])) {
				this.#modGuardName += moduleName[idx].toUpperCase();
				this.#modName      += moduleName[idx];
			}
		}

		this.#modGuardName += "_H__";
	}

	/**
	 * Returns the Module name.
	 * 
	 * @returns The name of the module.
	 */
	getModName()      { return this.#modName; }

	/**
	 * Get the amount of pattern of the Module.
	 * 
	 * @returns The amount of patterns from the Module.
	 */
	getPatternCount() { return this.#patternCount; }

	/**
	 * Get if a valid Krawall version has been provided.
	 * 
	 * @returns If a valid Krawall version has been provided.
	 */
	getKrawallValid() { return this.#ver != 0; }


	/**
	 * Extracts the ptrnIdx'd pattern.
	 * 
	 * @param ptrnIdx The index from the pattern table.
	 * 
	 * @returns A string containing the assembly data for the pattern.
	 */
	extractPattern(ptrnIdx) {
		if (ptrnIdx >= this.#patternCount || this.#ver == 0) return "";

		/* Get bases to work with. */
		const addr  = this.#view.getUint32(this.#modOffs + patternTable + (ptrnIdx * 0x4), true) - romBase; // Get address we work on here.
		let ptrnOut = ".align\n@ ======================================================================\n@ \"Pattern" + ptrnIdx.toString() + " (0x" + (addr + romBase).toString(16).toUpperCase().padStart(8, "0") + ")\"\n";
		ptrnOut    += "LModule_" + this.#modName + "_" + "Pattern" + ptrnIdx.toString() + ":\n"; // Define the Label Start.

		/* Get the data indexes. */
		ptrnOut += ".short ";
		for (let idx = 0; idx < 16; idx++) {
			ptrnOut += this.#view.getUint16(addr + (idx * 2), true).toString();

			if (idx < 15) ptrnOut += ", ";
		}

		/* Get the rows. They depend on the < 2004-07-07 and >= 2004-07-07 version. */
		if (this.#ver == 2) ptrnOut += "\n.short " + this.#view.getUint16(addr + patternRows, true).toString() + "\n"; // >= 2004-07-07 uses 16 bits.
		else                ptrnOut += "\n.byte " + this.#view.getUint8(addr + patternRows).toString()  + "\n";        // < 2004-07-07 uses 8 bits.

		/*
			Check if a next pattern exist,
			if so, we can just get the end offset of the pattern by checking the next pattern pointer address and if not,
			just use the module start address as an end offset, because the actual module is after the pattern data.
		*/
		const nextPattern    = this.#view.getUint32(this.#modOffs + patternTable + ((ptrnIdx + 1) * 0x4), true);
		const nextPatternAvl = nextPattern >= romBase && nextPattern <= romEnd; // Check ROM Range.
		const endPatternOffs = nextPatternAvl ? (nextPattern - romBase) : this.#modOffs;

		ptrnOut += ".byte ";

		/* Get the last unsigned bytes until the end. */
		for (let idx = addr + (this.#ver == 2 ? patternData2004 : patternData2003), lineCount = 0; idx < endPatternOffs; idx++) {
			ptrnOut += this.#view.getUint8(idx).toString();
			lineCount++;

			if (idx < endPatternOffs - 1) {
				/* On this case, we'll add a new line and reset the line count to 0 again. */
				if (lineCount >= dataPerLine) {
					lineCount  = 0;
					ptrnOut += "\n.byte ";

					/* Otherwise add the comma separator for the next signed byte. */
				} else {
					ptrnOut += ", ";
				}
			}
		}

		ptrnOut += "\n"; // Assembly files should usually be ended with a newline, so here we go.
		return ptrnOut;
	}


	/**
	 * Extracts all patterns and creates the "module.S" file.
	 * 
	 * @returns A string containing the assembly data of the Module.
	 */
	extractModule() {
		if (this.#patternCount <= 0 || this.#ver == 0) return "";
		
		let moduleOut = ".global mod_" + this.#modName + "\n.section .rodata\n"; // The header.

		/* Extract the Module data. */
		for (let idx = 0; idx < this.#patternCount; idx++) moduleOut += "\n" + this.extractPattern(idx);

		moduleOut += "\n\n.align\nmod_" + this.#modName + ":\n"; // Define the Module.

		/* Get the channels. */
		moduleOut += ".byte " + this.#view.getUint8(this.#modOffs + channels).toString() + " @ # channels\n";

		/* Get the numOrders and the song restart state. */
		moduleOut += ".byte " + this.#view.getUint8(this.#modOffs + numOrders).toString() + ", "
							  + this.#view.getUint8(this.#modOffs + songRestart).toString() + " @ orders, songRestart\n@ pattern orderlist:\n";

		/* Here the pattern order list. */
		moduleOut += ".byte ";
		for (let idx = 0, LineCount = 0; idx < 256; idx++) {
			moduleOut += this.#view.getUint8(this.#modOffs + order + idx).toString();
			LineCount++;

			if (idx < 255) {
				if (LineCount == dataPerLine) {
					LineCount = 0;
					moduleOut += "\n.byte ";

				} else {
					moduleOut += ", ";
				}
			}
		}

		/* Get the channelPan table. */
		moduleOut += "\n@ panlist:\n.byte ";
		for (let idx = 0; idx < 32; idx++) {
			moduleOut += this.#view.getInt8(this.#modOffs + channelPan + idx).toString();

			if (idx < 31) moduleOut += ", ";
		}

		/* Get the Song Indexes. */
		moduleOut += "\n@ songIndex:\n.byte ";
		for (let idx = 0; idx < 64; idx++) {
			moduleOut += this.#view.getUint8(this.#modOffs + songIndex + idx).toString();

			if (idx < 63) moduleOut += ", ";
		}

		/* Get the volGlobal. */
		moduleOut += "\n.byte " + this.#view.getUint8(this.#modOffs + volGlobal).toString() + " @ volGlobal\n";

		/* Get the Speed / BPM. */
		moduleOut += ".byte " + this.#view.getUint8(this.#modOffs + initSpeed).toString() + ", "
							  + this.#view.getUint8(this.#modOffs + initBPM).toString() + " @ speed/bpm\n";

		/* Get the Flags. */
		moduleOut += ".byte " + this.#view.getUint8(this.#modOffs + flagInstrBased).toString() + ", "
							  + this.#view.getUint8(this.#modOffs + flagLinearSlides).toString() + ", "
							  + this.#view.getUint8(this.#modOffs + flagVolSlides).toString() + ", "
							  + this.#view.getUint8(this.#modOffs + flagVolOpt).toString() + ", "
							  + this.#view.getUint8(this.#modOffs + flagAmigaLimits).toString() + ", "
							  + this.#view.getUint8(this.#modOffs + padding).toString();

		/* And now the Patterns. */
		moduleOut += "\n.word ";
		for (let idx = 0, lineCount = 0; idx < this.#patternCount; idx++) {
			moduleOut += "LModule_" + this.#modName + "_" + "Pattern" + idx.toString();
			lineCount++;

			if (idx < this.#patternCount - 1) {
				/* 8 patterns reached, new line. */
				if (lineCount == patternPerLine) {
					lineCount = 0;
					moduleOut  += "\n.word ";

				/* Just add the comma separator for the next pattern. */
				} else {
					moduleOut += ", ";
				}
			}
		}

		moduleOut += "\n"; // Assembly files should usually be ended with a newline, so here we go.
		return moduleOut;
	}


	/**
	 * Creates the header file for the current Module that you can use in your project.
	 * Only useful if you have a single module!
	 * 
	 * @returns A string containing the C header data.
	 */
	createModuleHeader() {
		let headerOut = "#ifndef " + this.#modGuardName + "\n#define " + this.#modGuardName + "\n\n"; // Define the Header Guard.
		headerOut    += "extern const Module mod_" + this.#modName + ";\n";
		headerOut    += "\n#endif";
		return headerOut;
	}
};