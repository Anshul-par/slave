import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import axios from "axios";
import { Upload } from "@aws-sdk/lib-storage";
import { S3 } from "@aws-sdk/client-s3";
import { writeLog } from "./index.js";

export async function watchDirectory(directoryPath) {
  writeLog(`Watching for file changes in ${directoryPath}...`);

  fs.watch(directoryPath, async (eventType, filename) => {
    if (eventType === "rename" && filename) {
      const filePath = path.join(directoryPath, filename);

      // Check if the file exists and is a JSON file
      if (fs.existsSync(filePath) && path.extname(filePath) === ".json") {
        writeLog(`New file added: ${filePath}`);

        // Read file and store in buffer
        const fileBuffer = fs.readFileSync(filePath);

        // Initialize S3 client
        const s3 = new S3({
          endpoint: process.env.S3_END_POINT,
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_DO,
            secretAccessKey: process.env.AWS_SECRET_KEY_DO,
          },
        });

        // Upload file to S3
        try {
          await new Upload({
            client: s3,
            params: {
              ContentType: "application/json",
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: filename,
              Body: fileBuffer,
              ACL: "public-read",
            },
          }).done();
          writeLog(`File uploaded to S3: ${filename}`);
        } catch (error) {
          writeLog(`Error uploading to S3: ${error.message}`);
        }

        // Call the webhook of the main server
        const webhookUrl = process.env.WEBHOOK_URL;

        try {
          const response = await axios.post(webhookUrl, { filename });
          if (response.status === 200) {
            writeLog("Webhook called successfully.");
          } else {
            writeLog("Webhook call failed.");
          }
        } catch (error) {
          writeLog(`Error calling webhook: ${error.message}`);
        }
      }
    }
  });
}
