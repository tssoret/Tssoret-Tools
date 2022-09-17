# Griptonite Text Tools

These tools are used to work with Griptonite's Internal Text format.

There are 3 core scripts:
- `GPNTTextDecoder`: Used to decode an encoded byte array to a read-able string.
- `GPNTTextEncoder`: Used to encode a list of Strings, a charTable and encoding to the Griptonite Internal Text Format.
- `GPNTTextParser`:  Used to parse Griptonite's Internal Text Format and get the encoded bytes + it's decoded string.

---

## Requirements
There are a few requirements to properly make use of these tools.

### GPNTTextDecoder
Griptonite Text Decoder requires the following things to work:
- An object of keys and values like `"0x21": "!"` for the encoding.
- An array of the 16-bit CharTable of strings like `"0x0168"`.

### GPNTTextEncoder
Griptonite Text Encoder requires the following things to work:
- An object of keys and values like `"0x21": "!"` for the encoding.
- An array of the 16-bit CharTable of strings like `"0x0168"`.
- An array of strings to encode.

### GPNTTextParser
Griptonite Text Parser requires the following things to work:
- An object of keys and values like `"0x21": "!"` for the encoding.
- The Griptonite Internal Text binary as a DataView.

---

## Script Example
***Here is a basic implementation using Deno that you can base it on for your own project.***

<details>
	<summary>Click here to view the example.</summary>

```js
/* import the cores from the Tssoret-Tools repository. */
import { GPNTTextDecoder } from "https://raw.githubusercontent.com/tssoret/Tssoret-Tools/main/gpnttexttools/cores/GPNTTextDecoder.js";
import { GPNTTextEncoder } from "https://raw.githubusercontent.com/tssoret/Tssoret-Tools/main/gpnttexttools/cores/GPNTTextEncoder.js";
import { GPNTTextParser  } from "https://raw.githubusercontent.com/tssoret/Tssoret-Tools/main/gpnttexttools/cores/GPNTTextParser.js";

/*
	NOTE: These examples are based of Sims 2 GBA English.

	Example for GPNTTextDecoder.
*/
{
	/*
		The encoding bytes for "Hello World!".
		
		You can encode a custom string using GPNTTextEncoder, that's how the encoded array got generated below.

		"Hello World!" is 12 Bytes large if you were to go with 1 byte per character, the Encoded one is 9, so saving 3 bytes of space.
	*/
	const helloWorld = [
		0x25, 0x37, 0xC6, 0x3C,
		0x48, 0x8E, 0x48, 0xFB,
		0x3
	];

	/* Load and parse the required JSON files to decode the helloWorld array. */
	const charTable = JSON.parse(Deno.readTextFileSync("table.json"));
	const encoding  = JSON.parse(Deno.readTextFileSync("encoding.json"));

	/* Load them into the Instance of Griptonite Text Decoder. */
	let Instance = new GPNTTextDecoder(charTable, encoding);

	/* log "Hello World!" on the console from the helloWorld encoded byte array. */
	console.log(Instance.decodeBytes(helloWorld));
}

/* Example for GPNTTextEncoder. */
{
	/* Parse all 3 required JSON files. */
	const strings   = JSON.parse(Deno.readTextFileSync("strings.json"));
	const charTable = JSON.parse(Deno.readTextFileSync("table.json"));
	const encoding  = JSON.parse(Deno.readTextFileSync("encoding.json"));

	/* Load them into the Instance of Griptonite Text Encoder. */
	let Instance = new GPNTTextEncoder(strings, charTable, encoding);

	/* Creating the Griptonite Text File using the provided files and writing it to a file. */
	const output = Instance.createGPNTText();
	Deno.writeFileSync("generated.gpnttext", output);

	/* Encoding a custom string into a encoded byte array and log it to the console. */
	const encoded = Instance.encodeString("Hello World!");
	console.log(encoded);
}

/* Example for GPNTTextParser. */
{
	/* Create the DataView for the Griptonite Text file. */
	let gpnttextRaw    = Deno.readFileSync("binary.gpnttext");
	const gpnttextView = new DataView(gpnttextRaw.buffer);

	/* Load and parse the Encoding. */
	const encoding = JSON.parse(Deno.readTextFileSync("encodings/s2gba.json"));

	/* Load them into the Instance of Griptonite Text Parser. */
	let Instance = new GPNTTextParser(gpnttextView, encoding);

	/*
		Log the last string's data as:
		
		{
			encoded: [ ],
			string: ""
		}
	*/
	console.log(Instance.fetchString(Instance.stringCount() - 1));
}
```
</details>

---

## Running the example
***The example above requires [Deno](https://deno.land/) to be installed on your System.***

After that, you'll run `Deno run <ExampleFile>.js`.

*Replace `<ExampleFile>` with whatever file you put the example in.*

***You can also implement your own Script, the example is just a little demonstration.***

---

## Script Credits
- Contributors: [Epicpkmn11](https://github.com/Epicpkmn11), [SuperSaiyajinStackZ](https://github.com/SuperSaiyajinStackZ)
- Last Updated: 17. September 2022
- Purpose: Work with Griptonite's Internal Text Format.
- Version: v0.1

---