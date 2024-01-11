import {promises as fs} from 'fs';
import {join} from 'path';

const assetDirs = ['sounds', 'textures'];
const names = {
    meta: 'meta.json',
    splash: 'Splash.png'
};
const metaRequiredFields = ['source', 'author'];
const metaUrls = ['source', 'twitter', 'itch', 'donate', 'patreon', 'twitch'];

const unfriendly = /([_!]|  )/;
const isUnfriendly = str => unfriendly.test(str);

const isValidUrl = urlString => {
    try {
        return Boolean(new URL(urlString));
    }
    catch(e) {
        return false;
    }
};
const exists = async path => {
    try {
        await fs.access(path);
        return true;
    }
    catch(e) {
        void e;
        return false;
    }
};

(async () => {
    const complaints = [];
    for (const assetDir of assetDirs) {
        console.log(`\n⌛  Checking ${assetDir}…\n`);
        const subdirs = await fs.readdir(assetDir);
        const namesKeys = Object.keys(names);
        await Promise.all(subdirs.map(async (subdir) => {
            const packName = subdir;
            let hasComplaints = false;
            const existsPrompts = await Promise.all(namesKeys.map(name => exists(join(assetDir, subdir, names[name]))));
            if (isUnfriendly(packName) || packName[0].toLowerCase() === packName[0]) {
                hasComplaints = true;
                console.warn(`⚠️   ${packName} has an unfriendly name. Make sure it does not have special symbols and is capitalized.`);
            }
            existsPrompts.forEach((result, ind) => {
                if (!result) {
                    hasComplaints = true;
                    console.error(`⚠️   ${packName} does not contain a ${names[namesKeys[ind]]}`);
                }
            });
            if (existsPrompts[0]) {
                try {
                    const meta = JSON.parse(await fs.readFile(join(assetDir, subdir, names.meta)));
                    for (const metaField of metaRequiredFields) {
                        if (!(metaField in meta)) {
                            hasComplaints = true;
                            console.error(`⚠️   ${packName} does not contain a ${metaField} field.`);
                        }
                    }
                    for (const metaField of metaUrls) {
                        if (!(metaField in meta)) {
                            continue;
                        }
                        if (!isValidUrl(meta[metaField])) {
                            hasComplaints = true;
                            console.error(`⚠️   ${packName}'s ${metaField} field is not a valid URL.`);
                        }
                    }
                } catch (err) {
                    console.error(`⚠️   ${packName} has a malformed meta.json file.`);
                    console.error(err);
                }
            }
            if (hasComplaints) {
                complaints.push([assetDir, packName]);
            }
        }));
    }

    if (complaints.length > 0) {
        console.error(`\n\n⚠️   ${complaints.length} asset packs contain complaints:`);
        for (const [assetDir, packName] of complaints) {
            console.error(`    ${assetDir} – ${packName}`);
        }
        process.exit(1);
    } else {
        console.log('\n\n✅ All asset packs are valid.');
    }
})();