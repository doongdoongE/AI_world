import * as fs from "fs";
import { Configuration, OpenAIApi } from "openai";
import * as marked from "marked";
import { config } from "dotenv";
import { get_encoding, encoding_for_model } from "@dqbd/tiktoken";
import path from "path";

config(); // dotenv 설정

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const filePath = __dirname + "/open-ai.js";
const fine_tunes = [];
const model = "gpt-3.5-turbo";

config(); // dotenv 설정

const configuration = new Configuration({
  organization: process.env.ORGANIZATION,
  apiKey: process.env.OPEN_AI_API_KEY,
});

const enc = encoding_for_model(model);

function convertToHtml(answer) {
  answer.content = marked.marked(answer.content);
}

const openAI = new OpenAIApi(configuration);

async function getResponse(prompt) {
  try {
    const response = await openAI.createChatCompletion(
      {
        model,
        messages: prompt,
        temperature: 0.7,
      },
      {
        timeout: 120000 * 2,
        maxBodyLength: 8192 * 2,
      }
    );

    const totalTokens = response.data.usage.prompt_tokens;
    console.log("use token : ", totalTokens);

    return response.data.choices[0].message.content;
  } catch (err) {
    const errorData = err.response?.data;
    if (errorData.code === "context_length_exceeded") {
      console.log("context_length_exceeded");
    }
    throw err;
  }
}

export async function handleInput(conversation_history) {
  // AI 역할 지정
  const requestConversation = [
    {
      role: "system",
      content:
        "You are a nodejs, html developer assistant and code reviewer. And answer me in English",
    },
  ];
  // 데이터를 파일로 저장합니다.
  if (fine_tunes && fine_tunes.length === 0) {
    const filePath = __dirname + "/fine_tunes.json";

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("기존 파일 삭제 완료");
    }
    // 주어진 데이터를 가공하여 결과 배열에 추가
    for (let i = 0; i < conversation_history.length; i += 2) {
      // assistant가 빠져있을 경우, user content도 제거
      if (
        conversation_history[i + 1] === undefined ||
        conversation_history[i + 1].role !== "assistant"
      ) {
        continue;
      }
      const prompt = conversation_history[i].content;
      const completion = conversation_history[i + 1].content;
      fine_tunes.push({ prompt: prompt, completion: completion });
    }

    const stream = fs.createWriteStream(filePath, { flags: "a" });
    for (let i = 0; i < fine_tunes.length; i++) {
      const jsonStr = JSON.stringify(fine_tunes[i]);
      stream.write(jsonStr + "\n");
    }
    stream.end();
    console.log("fine_tunes 파일 쓰기 완료");
  }

  let currentUseToken = 0;
  for (let i = conversation_history.length - 1; i >= 0; i--) {
    currentUseToken += enc.encode(conversation_history[i].content).length;
    if (currentUseToken >= 2672) {
      conversation_history = conversation_history.slice(i + 1);
      break;
    }
  }

  // GPT에게 질문하고 응답 반환
  try {
    const response = await getResponse(
      conversation_history.reduce(
        (acc, cur) => acc.concat(cur),
        requestConversation
      )
    );
    const answer = { role: "assistant", content: response };
    console.log(`${model}: ${response}`);
    convertToHtml(answer);
    return { answer };
  } catch (err) {
    console.error(err);
    return Promise.reject(err);
  }
}
