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
	Script Name:     Krawall Sample Extractor
	Script Purpose:  Extracts the Samples from games using the Krawall Sound Engine back to a similar format like Krawerter does. (https://github.com/sebknzl/krawall/tree/master/krawerter)
	Script Creator:  SuperSaiyajinStackZ
	Last Updated:    17. September 2022
	Version:         0.2
	Additional Note: You need to provide the Sample Table Offset to make it work.
	                 You can usually find the table by looking for the krapInstPlay function where it gets the sample, or the processRow function of Krawall.
					 If the table has no valid ROM address pointers, then no samples exist.
*/

/* ROM Range definitions. */
const romBase = 0x08000000; // ROM Base is at 08000000, so we'd do - 0x08000000 at the end to get the actual binary location for pointers.
const romEnd  = 0x09FFFFFF; // 0x09FFFFFF is the max offset a normal GBA ROM can go.

/* Define some useful offsets to work with. */
const loopLength     = 0x0;  // 4 bytes.
const endOffs        = 0x4;  // Address to the end, 4 bytes.
const c2Freq         = 0x8;  // 4 bytes.
const fineTune       = 0xC;  // 1 byte.
const relativeNote   = 0xD;  // 1 byte.
const volDefault     = 0xE;  // 1 byte.
const panDefault     = 0xF;  // 1 byte.
const loop           = 0x10; // 1 byte.
const hq             = 0x11; // 1 byte.
const data           = 0x12; // X bytes.
const dataPerLine    = 0x80; // 128 bytes per line.
const samplesPerLine = 0x8;  // 8 Samples per line.


export class KrawallSampleExtractor {
	/* Private Variables. */
	#view;  // DataView instance.
	#table; // Samples Pointer Table address.
	#count; // Amount of Samples.

	/**
	 * Initialize some variables for this class.
	 * 
	 * @param view  A reference to an initialized DataView.
	 * @param table The Address to the Samples Pointer table.
	 */
	constructor(view, table) {
		/* You can also pass null and the functionality for empty samples data works too. */
		if (table == undefined || table == null) {
			this.#view  = view;
			this.#table = null;
			this.#count = 0;
			return;
		}

		this.#view   = view
		this.#table  = table;
		this.#count  = 0;

		/* Get the Samples Count. */
		do {
			const sAddr = this.#view.getUint32(this.#table + (this.#count * 0x4), true);

			/* If the Pointer is in ROM Section range, we have a proper sample pointer. */
			if (sAddr >= romBase && sAddr <= romEnd) this.#count++;
			else break; // If it's not in the range then that usually means no more samples available.
		} while(1);
	}


	/**
	 * Get the count of the Samples that was found.
	 *
	 * @returns The amount of samples that were found.
	 */
	sampleCount() { return this.#count; }


	/**
	 * Extracts the sampleIdx'd sample.
	 * 
	 * @param sampleIdx The index from the sample table.
	 * 
	 * @returns A string containing the assembly data for the sample.
	 */
	extractSample(sampleIdx) {
		if (sampleIdx >= this.#count) return ""; // Check for the index.

		/* Get bases to work with. */
		const addr    = this.#view.getUint32(this.#table + (sampleIdx * 0x4), true) - romBase; // Get address we work on here.
		let sampleOut = ".align\n@ ======================================================================\n@ \"Lsample" + sampleIdx.toString() + " (0x" + (addr + romBase).toString(16).toUpperCase().padStart(8, "0") + ")\"\n";
		sampleOut    += "Lsample" + sampleIdx.toString() + ":\n"; // Define the Label Start.

		/* Get loop Length + declare end address with LsampleX_end. */
		sampleOut += ".word " + this.#view.getUint32(addr + loopLength, true).toString() + ", Lsample" + sampleIdx.toString() + "_end\n";

		/* Get c2Freq. */
		sampleOut += ".word " + this.#view.getUint32(addr + c2Freq, true).toString() + "\n";

		/* Get fineTune, relativeNote. */
		sampleOut += ".byte " + this.#view.getInt8(addr + fineTune).toString() + ", " + this.#view.getInt8(addr + relativeNote).toString() + "\n";

		/* Get volDefault, panDefaultPos, loop, hq. */
		sampleOut += ".byte " + this.#view.getUint8(addr + volDefault).toString() + ", " + this.#view.getInt8(addr + panDefault).toString() + ", " + this.#view.getUint8(addr + loop).toString() + ", " + this.#view.getUint8(addr + hq).toString() + "\n";

		/* Now the signed 8 bit PCM data, while they are separated by 128 Values per line. */
		const end  = this.#view.getUint32(addr + endOffs, true) - romBase; // Get the end pointer.
		const diff = end - (addr + data); // Get the diff here for the loop.

		sampleOut += ".byte ";

		for (let idx = 0, lineCount = 0; ; idx++) {
			sampleOut += this.#view.getInt8((addr + data) + idx).toString();
			lineCount++;

			/* At this point we'll just end that with a newline and add the end label and break. */
			if (idx == diff - 1) {
				sampleOut += "\nLsample" + sampleIdx.toString() + "_end:\n";
				break;

			} else {
				/* On this case, we'll add a new line and reset the line count to 0 again. */
				if (lineCount == dataPerLine) {
					lineCount  = 0;
					sampleOut += "\n.byte ";

					/* Otherwise add the comma separator for the next signed byte. */
				} else {
					sampleOut += ", ";
				}
			}
		}

		/*
			According to Krawerter this section means:
			- "17*4 cause the max inc in the mixer can be (rounded up) 17 and we go 4 samples over the end in the worst case +1 for interpolation"
			Source: https://github.com/sebknzl/krawall/blob/master/krawerter/Sample.cpp#L232
		*/
		sampleOut += ".byte ";

		for (let idx = 0; idx < 69; idx++) {
			sampleOut += this.#view.getInt8(end + idx).toString();

			if (idx < 68) sampleOut += ", ";
		}

		sampleOut += "\n"; // Assembly files should usually be ended with a newline, so here we go.
		return sampleOut;
	}

	/**
	 * Extracts all Samples and creates the "samples.S" file.
	 * 
	 * @returns A string containing the assembly data for all samples.
	 */
	extractSamples() {
		if (this.#count <= 0) return ".global samples\n.section .rodata\n\n.align\n\nsamples:\n.word\n"; // Return empty samples.

		let sampleOut = ".global samples\n.section .rodata\n"; // The header.

		/* Extract the Sample data. */
		for (let idx = 0; idx < this.#count; idx++) sampleOut += "\n" + this.extractSample(idx);

		/* Now here add the Samples table. */
		sampleOut += "\n\n.align\nsamples:\n.word ";

		for (let idx = 0, lineCount = 0; idx < this.#count; idx++) {
			sampleOut += "Lsample" + idx.toString();
			lineCount++;

			if (idx < this.#count - 1) {
				/* 8 samples reached, new line. */
				if (lineCount == samplesPerLine) {
					lineCount = 0;
					sampleOut  += "\n.word ";

				/* Just add the comma separator for the next sample. */
				} else {
					sampleOut += ", ";
				}
			}
		}

		sampleOut += "\n"; // Assembly files should usually be ended with a newline, so here we go.
		return sampleOut;
	}


	/**
	 * Creates an empty C-header.
	 * 
	 * @returns A string containing the C header data.
	 */
	#createHeaderEmpty() { return "#ifndef __SAMPLES_H__\n#define __SAMPLES_H__\n\n#endif"; }

	/**
	 * Creates the C-header file for the Samples that you can use in your project.
	 * 
	 * @param includeCount if including the #define SAMPLES_COUNT or not.
	 * 
	 * @returns A string containing the C header data.
	 */
	createHeader(includeCount) {
		if (this.#count <= 0) return this.#createHeaderEmpty();

		let   headerOut = "#ifndef __SAMPLES_H__\n#define __SAMPLES_H__\n\n"; // Define the Header Guard.
		const maxNumLen = Math.max(0, this.#count - 1).toString().length;
		
		if (includeCount != undefined && includeCount == true) {
			headerOut += "#define SAMPLES_COUNT " + this.#count.toString() + "\n\n"; // Not available normally in Krawerter, but i find that a nice bonus definition.
		}

		/* Add the sample index definitions. */
		for (let idx = 0; idx < this.#count; idx++) headerOut += ("#define SAMPLES_SAMPLE_" + idx.toString().padStart(maxNumLen, "0")) + " " + idx.toString() + "\n";

		/* End the Header Guard. */
		headerOut += "\n#endif";
		return headerOut;
	}
};