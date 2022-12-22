# Getting Info

With the help of Ghidra, we can find the Krawall Version, Samples, Instruments and Modules used with the Krawall Sound Engine.
Below you will find instructions how you can find those and if Krawall is even being used.

***First of all, install Ghidra and run it. (Just look up Ghidra and follow it's guide) and then follow the steps below.***


## Creating a Ghidra Project
- Goto `File`, then select `New Project...`
- Select `Non-Shared Project`, then select `Next >>`.
- Choose a path and a Project name, then click `Finish`.

Now you have a Ghidra Project setted up, so we can continue on setting up the GBA ROM Binary for Ghidra below.

---

## Setting up a GBA ROM
- Goto `File`, then `Import File...` and select your GBA ROM.
- If you have a compatible GhidraGBA version, then it should auto detect the ROM as a GBA ROM and set it up for you, but in case if not (which may be the case, since GhidraGBA is usually not up-to-date for Ghidra), follow the steps below.
    - Select the `...` on `Language`.
    - Enter `v4t` on `Filter`.
    - Select the `little` version and click OK.
    - Click on `Options...`.
    - On `Block Name` enter `ROM`.
    - On `Base Address` enter `08000000`.
    - Then select `OK`.
    - Select `OK` again and you configured the binary to work with.

![](screenshots/loadfile.png?raw=true)
![](screenshots/language.png?raw=true)
![](screenshots/options.png?raw=true)

- Double click on the list on the file you just imported, it'll open the CodeBrowser.
- If it asks to analyze the binary, select `Yes`.
- After it, select `Analyze` (this may take a while and potentially show errors, but that shouldn't matter for this).

![](screenshots/yes-no-analyze.png?raw=true)
![](screenshots/analyze.png?raw=true)

When it's done, we can now properly start with finding if Krawall even exist inside the ROM.

    - NOTE: This just contains a basic setup of Ghidra for GBA ROMs. If you want a full setup, then you should probably try to build GhidraGBA on your own or setup some Labels + the Memory Map with the help of GBATEK for example manually.

---

## Finding the Krawall version
- Goto `Search`, then `For Strings...`.
- Check `All Blocks` and `Search All`, then press on `Search`.
- On `Filter`, enter `Krawall`.

![](screenshots/for-strings.png?raw=true)
![](screenshots/for-strings-box1.png?raw=true)
![](screenshots/krawall-search-filter.png?raw=true)

After the filter is done, it should show something like:
    - `"$Id: Krawall $Id: version.h 8 2005-04-21 12:24:45Z seb $"`

Note, that the string varies per Krawall version, that is just the string used in the latest commercial Krawall version in 2005.
If you found that string, then congrats, the game uses the Krawall Sound Engine! If not, then it may be either stripped out, or it doesn't use Krawall.

    - You SHOULD note the date, as you'll need it for the Krawall Data Extractor if you plan to use it.
    
***New Note: It seems like `Krawall` may not exist on the version string as noticed on `The Sims: Bustin' Out GBA (EUR/USA)`, it contains: `$Id: player.c,v 1.4 2003/03/19 23:12:15 seb Exp $`.***

---

## Samples
- Goto `Search`, then `Memory...`.
- Ensure `All Blocks` is checked, and `Search All` too.
- Search for the following byte sequence:
    - `f0 b5 57 46 46 46 c0 b4 16 1c`
- This should get you 1 match and that is the function:
    - `krapInstPlay`

![](screenshots/memory.png?raw=true)
![](screenshots/krapinstplay-sequence.png?raw=true)
![](screenshots/krapinstplay-res.png?raw=true)

- Scroll down until you see something like:
    - `iVar5 = *(int *)(PTR_PTR_DAT_0805580c + (uint)*(ushort *)(param_1 + param_2 * 2) * 4);`
        - NOTE: The following above may vary, but it should look similar with `param_1 + param_2`.
- `PTR_PTR_DAT_XXXXXXXX` is the samples pointer table.
    - Sometimes Ghidra does NOT directly point to the actual address (Like on this case here) but instead to a declaration somewhere stored at the end of the function, in that case you have to go there by double clicking on the `PTR_DAT_09f641fc` like shown in the screenshots and it will point you to the actual address. 

![](screenshots/samples-func.png?raw=true)
![](screenshots/samples-need-relook.png?raw=true)
![](screenshots/proper-samples.png?raw=true)

---

## Instruments
- Look at the references to the Samples table.

![](screenshots/samples-ref.png?raw=true)

- You should see a function that has probably 3 read references to it, go to the first read.
- Now you should see something like:
    - `(iVar13 << 0x10) >> 0xe`
- in that case, that's the Instrument table.
    - If that doesn't have any valid pointers, that means none exist, otherwise it has.

![](screenshots/instruments-func.png?raw=true)
![](screenshots/instruments-need-relook.png?raw=true)
![](screenshots/proper-instruments.png?raw=true)

---

## Modules
- Search for a Sequence like this:
    - `f0 b5 57 46 4e 46 45 46 e0 b4 80 46 02 20 0f 1c` (Krawall >= `2004-07-07`)
    - `f0 b5 57 46 4e 46 45 46 e0 b4 0f 1c 80 46 92 46` (Krawall <  `2004-07-07`)
- This should get you 1 match and that is:
    - `krapPlay`

![](screenshots/krapplay-sequence.png?raw=true)
![](screenshots/krapplay-res.png?raw=true)

- Now search for references to `krapPlay`, there is no "universal" way to detect all modules, so you have to track down the references and look at the first parameter for the module address.
    - Some games may have a Module table stored somewhere, but some may not, it's up to you to find them.
        - On Sims 2 GBA as an example here, it indeed has a table stored like shown in the screenshot, but with also data for the Mode and the Song Index for `krapPlay`.

![](screenshots/krapplay-ref.png?raw=true)
![](screenshots/krapplay-call.png?raw=true)

---