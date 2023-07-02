import { v2 as cloudinary } from "cloudinary";
import { unlink } from "fs";
import { exec } from "child_process";
import env from "./config";

cloudinary.config({
  cloud_name: env.CLOUDINARY.CLOUD_NAME,
  api_key: env.CLOUDINARY.API_KEY,
  api_secret: env.CLOUDINARY.API_SECRET,
});

const uploadToCloudinary = async ({ name, path }: { name: string, path: string }) => {
  console.log("Uploading backup to Cloudinary...");
  const date = new Date();

  await cloudinary.uploader.upload(path, {
    public_id: name,
    resource_type: 'auto',
    folder: `databaseBackups/${date.getFullYear()}/Month-${date.getMonth() + 1}`,
  });

  console.log("Backup uploaded to Cloudinary...");
};

const dumpToFile = async (path: string) => {
  console.log("Dumping DB to file...");

  await new Promise((resolve, reject) => {
    const command = `mysqldump --user=${env.DATABASE.MYSQL_USERNAME} --password=${env.DATABASE.MYSQL_PASSWORD} --host=${env.DATABASE.MYSQL_HOST} --port=${env.DATABASE.MYSQL_PORT}  --single-transaction --routines --triggers --databases ${env.DATABASE.MYSQL_DATABASE} > ${path}`;
    exec(command, (error, _, stderr) => {
      if (error) {
        reject({ error: JSON.stringify(error), stderr });
        return;
      }
      resolve(undefined);
    });
  });

  console.log("DB dumped to file...");
};

const deleteFile = async (path: string) => {
  console.log("Deleting file...");
  await new Promise((resolve, reject) => {
    unlink(path, (err) => {
      if (err) {
        reject({ error: JSON.stringify(err) });
        return;
      }
      resolve(undefined);
    });
  });
};



export const backup = async () => {
  console.log("Initiating DB backup...");

  let date = new Date().toISOString();
  const timestamp = date.replace(/[:.]+/g, "-");
  const filename = `backup-${timestamp}.sql`;
  const filepath = `/tmp/${filename}`;

  try {
    await dumpToFile(filepath);
    await uploadToCloudinary({ name: filename, path: filepath });
    await deleteFile(filepath);
  } catch (error) {
    console.log('An error ocurred!', error);
  }

  console.log("DB backup complete...");
};
