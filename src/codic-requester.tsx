import React, { FC, useState } from 'react';
import axios from 'axios';

type TranslateRequest = {
  project_id: string;
  text: string;
  casing: string;
}
type TranslatedText = {
  origin: string;
  translated_text?: string;
}

const Translate: FC<{ target: Array<string>, filename: string }> = ({ target, filename }) => {
  const urls = {
    translate: "/v1/engine/translate.json",
    createTable: "/create"
  };
  const request_base: TranslateRequest = {
    project_id: '21109',
    text: '',
    casing: "lower underscore"
  }
  const [request, setRequest] = useState(request_base)
  const [buffer, setBuffer] = useState(Array<TranslatedText>())

  const translate = async (text: string): Promise<TranslatedText> => {
    request.text = text;
    const result = await axios.post(urls.translate, request)
      .then(res => {
        let data = JSON.parse(JSON.stringify(res.data[0]))
        console.log(data.translated_text);
        return {origin:text, translated_text: data.translated_text}
      }).catch(e =>{
        console.error(e);
        return {origin:text, translated_text: undefined};
      })
    return result;
  }

  const handleSubmit = async (event: React.ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    // await setBuffer(Array<TranslatedText>());
    const translated_results = await Promise.all(target.map(async text => await translate(text)))
    // console.log(trans.translated_text)
    // const data = await Promise.all(regist.map(r => r))
    setBuffer(translated_results.flat())
  }
  const handleCreateTable = async (event: React.ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    axios.post(urls.createTable, {filename: filename, header: buffer})
      .then(res => {
        let data = JSON.parse(JSON.stringify(res.data));
        console.log(data);
      })
  }
  const generateRows = buffer.map((item) => {
      return (
        <tr key={item.translated_text}>
          <td>{item.origin}</td>
          <td>{item.translated_text}</td>
        </tr>
      );
    })

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <button type="submit">Submit</button>
      </form>
      {buffer.length > 0 && (
        <table>
          <thead>
            <th>text</th>
            <th>translated text</th>
          </thead>
          <tbody>{generateRows}</tbody>
        </table>
      )}
      <form onSubmit={handleCreateTable}>
        <button type="submit">Create Table</button>
      </form>
    </div>
  )
}
export default Translate