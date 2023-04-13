import * as fs from "fs";
import FormData from "form-data";
import axios from "axios";
import { Configuration, OpenAIApi } from "openai";
import { config } from "dotenv";
import path from "path";

config(); // dotenv 설정

export function fileTest() {
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const filePath = __dirname + "/fine_tune.json";

  const organization = process.env.ORGANIZATION;
  const apiKey = process.env.OPEN_AI_API_KEY;
  const model = "gpt-3.5-turbo";

  const file = fs.createReadStream(filePath);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "fine-tune");
  file.close();

  const configuration = new Configuration({
    apiKey: apiKey,
  });
  const openai = new OpenAIApi(configuration);
  axios
    .post("https://api.openai.com/v1/files", formData, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...formData.getHeaders(),
      },
    })
    .then((response) => {
      console.log(response.data);

      // 파일 업로드가 완료되면, 분석을 수행합니다.
      const fileId = response.data.id;
      openai.files
        .retrieve(fileId, { format: "text" })
        .then((fileData) => {
          console.log(fileData);

          // 파일 데이터를 분석합니다.
          const prompt = fileData.data;
          openai.completions
            .create({
              engine: model,
              prompt: prompt,
              maxTokens: 1024,
              n: 1,
              stop: ["\n"],
              temperature: 0.5,
            })
            .then((response) => {
              console.log(response.data.choices[0].text);
            })
            .catch((error) => {
              if (error.response?.data) console.error(error.response?.data);
            });
        })
        .catch((error) => {
          if (error.response?.data) console.error(error.response?.data);
        });
    })
    .catch((error) => {
      if (error.response?.data) console.error(error.response?.data);
    });
}
