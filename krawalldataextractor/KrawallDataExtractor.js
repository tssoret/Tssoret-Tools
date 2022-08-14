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

/* import the cores. */
import { KrawallInstrumentExtractor } from "./cores/KrawallInstrumentExtractor.js";
import { KrawallModuleExtractor }     from "./cores/KrawallModuleExtractor.js";
import { KrawallSampleExtractor }     from "./cores/KrawallSampleExtractor.js";


/* Base paths. */
const krawallDataBasepath   = "data";    // Store the .S files inside data.
const krawallHeaderBasePath = "include"; // Store the .h files inside include.

/* Data Paths for Instruments, Modules and Samples. */
const instrumentsDataPath = krawallDataBasepath;              // Because Instruments only have 1 .S file, we just need them on the data root.
const modulesDataPath     = krawallDataBasepath + "/modules"; // Modules can be multiple, so store them in a modules folder.
const samplesDataPath     = krawallDataBasepath;              // Because Samples only have 1 .S file, we just need them on the data root.

/* Some other variables. */
let queueTable = [ ];
let outFolder  = "out";


/*
	Parsing the JSON for the queueTable.

	jsonPath: Path to the JSON.
*/
function parseData(jsonPath) {
	const rawData = Deno.readTextFileSync(jsonPath);
	const json    = JSON.parse(rawData);

	/* Not sure if they can be null. */
	if (json == undefined || json == null) return;

	/* A template which we pass in to queueTable on success and modify with the JSON defined data. */
	const entry = {
		addmodtable: false,
		binary:      "",
		instruments: null,
		krawallver:  "",
		modules:     [ ],
		out:         "",
		samples:     null
	};

	if (json.addmodtable == true) entry.addmodtable = true; // Only set to true if true.

	/* Ensure we have something there. */
	if (json.binary == "") return;
	entry.binary = json.binary;

	/* Can also be non existing, hence check with parseInt() and isNan(). */
	const instruments = parseInt(json.instruments, 16);
	if (!isNaN(instruments)) entry.instruments = instruments;

	/* Check Krawall Version. It MUST be specified. */
	if (json.krawallver == undefined || json.krawallver == "") return;
	/* check for valid version string. */
	switch(json.krawallver) {
		case "2003-09-01":
		case "2004-07-07":
		case "2004-09-17":
		case "2004-11-14":
		case "2005-04-21":
			entry.krawallver = json.krawallver;
			break;

		default:
			return;
	}

	/* Check through the Modules. */
	for (let idx = 0; idx < json.modules.length; idx++) {
		const offs = parseInt(json.modules[idx].offs, 16);
		if (!isNaN(offs)) {
			const name          = (json.modules[idx].name == "" ? ("Module" + idx.toString().padStart(2, "0")) : json.modules[idx].name);
			const modTableEntry = { name: name, offs: offs };

			entry.modules.push(modTableEntry);
		}
	}

	/* Out must be a valid out folder and is not allowed to have a slash at the end. */
	if (json.out == "" || json.out[json.out.length - 1] == "/") return;
	entry.out = json.out;

	/* Can also be non existing, hence check with parseInt() and isNan(). */
	const samples = parseInt(json.samples, 16);
	if (!isNaN(samples)) entry.samples = samples;

	queueTable.push(entry); // Push to the queue at the end if succeeded.
}


/* Parsing the provided deno arguments. */
function parseArgs() {
	const args = Deno.args;

	if (args.length > 0x0) {
		let type = "";

		for (let idx = 0x0; idx < args.length; idx++) {
			/* Directly switch fetch types on -i or -o. */
			if (args[idx] == "-i" || args[idx] == "-o") {
				type = args[idx];

			/* We don't switch types, so have sub args to a type instead. */
			} else {
				switch(type) {
					case "-i": // -i are the JSON Inputs, so parse them for queueTable.
						parseData(args[idx]);
						break;

					case "-o": // -o is the output directory that can be specified optionally, defaults to out.
						outFolder = args[idx];
						break;
				}
			}
		}
	}
}


/*
	--------------------------
	Now run the actual process.
	--------------------------
*/
parseArgs(); // Parse Deno Arguments.
if (queueTable.length == 0) console.log("Nothing to do here.");
else {
	if (outFolder[outFolder.length - 1] != "/") {
		console.log("Starting the extracting process ... Entries: " + queueTable.length.toString() + ".");

		/* Run the extracting process. */
		for (let queueIdx = 0; queueIdx < queueTable.length; queueIdx++) {
			const table = queueTable[queueIdx];

			/* Create the neccessary base directories. */
			Deno.mkdirSync(outFolder + "/" + table.out + "/" + modulesDataPath,       { recursive: true });
			Deno.mkdirSync(outFolder + "/" + table.out + "/" + krawallHeaderBasePath, { recursive: true });

			/* Get the DataView for the ROM Data. */
			const buffer = Deno.readFileSync(table.binary);
			const view   = new DataView(buffer.buffer);

			/* Handle Instruments (Required by Krawall). */
			{
				/* Init the Instance. */
				const instance = new KrawallInstrumentExtractor(view, table.instruments);

				/* Extract the Instrument data. */
				const instrumentData = instance.extractInstruments();
				Deno.writeTextFileSync(outFolder + "/" + table.out + "/" + instrumentsDataPath + "/instruments.S", instrumentData);

				/* Create a C / C++ compatible Header file. */
				const headerData = instance.createHeader();
				Deno.writeTextFileSync(outFolder + "/" + table.out + "/" + krawallHeaderBasePath + "/instruments.h", headerData);
			}

			/* Handle Modules (Not required by Krawall). */
			{
				/* Only handle modules, if there are any, since those are optional and don't rely on Krawall. */
				if (table.modules.length > 0) {
					const addModuleTable = (table.addmodtable != undefined && table.addmodtable == true);

					let cData = "";
					/* If we add the modules table, declare the krawall header, modules header and the start of the mod_Table here. */
					if (addModuleTable) {
						cData = "#include \"krawall.h\"\n";
						cData += "#include \"modules.h\"\n\n";
						cData += "const Module *mod_Table[] = { ";
					}

					let headerData = "#ifndef __MODULES_H__\n#define __MODULES_H__\n\n"; // Define the Header Guard.
					if (addModuleTable) headerData += "#define MOD_COUNT " + table.modules.length.toString() + "\n\n"; // The count is really only useful if we have the module table.

					/* Init the Instance. */
					const instance = new KrawallModuleExtractor(view, table.modules[0].offs, table.modules[0].name, table.krawallver);

					/* Ensure we provided a valid Krawall version. */
					if (instance.getKrawallValid()) {
						/* Go through all Modules and extract them all. */
						for (let idx = 0; idx < table.modules.length; idx++) {
							/* Set which Module to extract, in that case the offset + name from the Module Table. */
							instance.setModule(table.modules[idx].offs, table.modules[idx].name);

							/* Extract the Module data. */
							const modData = instance.extractModule();
							Deno.writeTextFileSync(outFolder + "/" + table.out + "/" + modulesDataPath + "/mod_" + instance.getModName() + ".S", modData);

							/* Add the define for the Header. */
							headerData += "extern const Module mod_" + instance.getModName() + ";\n";
							if (addModuleTable) {
								cData += "&mod_" + instance.getModName();
								if (idx < table.modules.length - 1) cData += ", ";
							}
						}

						/* Write the optional modules table + header. */
						if (addModuleTable) {
							cData += " };\n";
							Deno.writeTextFileSync(outFolder + "/" + table.out + "/modules.c", cData);
							headerData += "extern const Module *mod_Table[];\n";
						}

						headerData += "\n#endif\n";
						Deno.writeTextFileSync(outFolder + "/" + table.out + "/" + krawallHeaderBasePath + "/modules.h", headerData);
					}
				}
			}

			/* Handle Samples (Required by Krawall). */
			{
				/* Init the Instance. */
				const instance = new KrawallSampleExtractor(view, table.samples);

				/* Extract the Sample data. */
				const sampleData = instance.extractSamples();
				Deno.writeTextFileSync(outFolder + "/" + table.out + "/" + samplesDataPath + "/samples.S", sampleData);

				/* Create a C / C++ compatible Header file. */
				const headerData = instance.createHeader();
				Deno.writeTextFileSync(outFolder + "/" + table.out + "/" + krawallHeaderBasePath + "/samples.h", headerData);
			}

			console.log("Entry " + (queueIdx + 1).toString() + " out of " + queueTable.length.toString() + " is done!")
		}

	} else {
		console.log("Using a slash as the last character on the output Directory is forbidden.");
	}
}