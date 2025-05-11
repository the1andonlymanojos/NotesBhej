import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const S3 = new S3Client({
  endpoint: "https://8125c1d09c1a52e66574d7ccdec40a3c.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "18fb6a46f26bbc8cf6754c5a886914b0",
    secretAccessKey: "0bc5cbd71bf763b3bb9716e2416c05d36e9e9730b6ca9083a61b277f5df1273a",
  },
  region: "auto",
});
try{
const url = await getSignedUrl(
  S3,
  new PutObjectCommand({
    Bucket: "notes",
    Key: "object",
  }),
  {
    expiresIn: 60 * 60 * 24 * 7, // 7d
  },
);
console.log(url);
} catch (error) {
    console.log(error)
}