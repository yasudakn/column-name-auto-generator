import React, { ChangeEvent, FC, useCallback, useEffect, useRef, useState } from 'react'
import csvParse from 'csv-parse/lib/sync';
import * as iconv from 'iconv-lite';
import axios from 'axios';
import './ExcelUploader.css';

type TranslateRequest = {
  project_id: string;
  text: string;
  casing: string;
}
type TranslatedText = {
  index: number;
  origin: string;
  translated_text?: string;
  error?: string;
  dtype?: string;
}
const ExcelUploader: FC = () => {
  const urls = {
    translate: "/v1/engine/translate.json",
    createTable: "/create"
  };
  const request_base: TranslateRequest = {
    project_id: process.env.REACT_APP_CODIC_PROJECT_ID || 'missing', // codic project id
    text: '',
    casing: "lower underscore"
  }
  const codic_url = "https://codic.jp/";
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  let request = request_base;
  const [translatedHeaders, setTranslatedHeaders] = useState<Array<TranslatedText>>([]);
  const [createTableStatus, setCreateTableStatus] = useState("");
  const requestMaxLength = 24;
  const [originHeaders, setOriginHeaders] = useState<Array<string>>([]);

  const handleTriggerReadFile = () => {
    if (fileInput.current) {
      fileInput.current.click();
    }
  }
  const handleReadFile = (fileObj?: File) => {
    if (fileObj) {
      setFile(fileObj);
      fileObj.arrayBuffer().then(async (buffer) => {
        // ヘッダー行のみ読み込む
        const decodedString = iconv.decode(Buffer.from(buffer), 'utf-8');
        setOriginHeaders(await csvParse(decodedString, { columns: true }));  // [{ key_1: 'value 1', key_2: 'value 2' }]
      })
    }
  }
  const translate = useCallback((item: string, index: number) => {
    let error = item.length > requestMaxLength ?
      `max length ${requestMaxLength}` : undefined;
    request.text = item.slice(0, requestMaxLength);
    axios.post(urls.translate, request)
      .then(res => {
        let data = JSON.parse(JSON.stringify(res.data[0]))
        console.log(`${index} ${data.translated_text}`);
        setTranslatedHeaders(prevBuffer => 
          [...prevBuffer, { index: index, origin: item, translated_text: data.translated_text, error: error, dtype: 'string' }].sort((a, b) => a.index - b.index));
      }).catch(e => {
        console.error(e);
      });
  },[urls.translate, request]);
  const outputEventUpdate = useCallback((originHeaders: Array<string>) => {
      if (originHeaders.length > 0 && originHeaders.length > translatedHeaders.length) {
        Promise.all(
          Object.keys(originHeaders[0]).map((item, index) => {return {origin: item, index: index}}).filter(
            x => x.origin.trim().length > 0).map(x => translate(x.origin, x.index)));
          setOriginHeaders([]);
      }
    },[translatedHeaders.length, translate]);

  useEffect(() => { 
    outputEventUpdate(originHeaders);
  }, [outputEventUpdate, originHeaders]);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let input = event.target;
    let files: FileList | null = input.files;

    handleReadFile(files ? files[0] : undefined);
  }
  const createFormData = () => {
    const json = JSON.stringify({
      filename: file?.name,
      header: translatedHeaders });
    const blob = new Blob([json], {
      type: 'application/json'
    });
    let params = new FormData();
    if ( file ) params.append('uploaded_file', file);
    params.append('header', blob);
    return params;
  }

  const handleCreateTable = async (event: React.ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    await axios({
      method: 'post',
      url: urls.createTable,
      data: createFormData(),
      headers: {'Content-Type': 'multipart/form-data'}
    })
      .then(res => {
        let data = JSON.parse(JSON.stringify(res.data));
        console.log(data);
        setCreateTableStatus(`success! 作成したテーブルは${data?.datasetId}:${data?.tableId}`);
      })
      .catch(e => {
        console.log(e);
        setCreateTableStatus(`fail! ${e}`);
      });
  }
  const onChangeCell = (index: number, key: string) => (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const _cells = [...translatedHeaders];
    _cells[index] = { ..._cells[index], [key]: event.target.value };
    setTranslatedHeaders(_cells);
  }
  const onChangeOption = (index: number, key: string) => (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    const _cells = [...translatedHeaders];
    _cells[index] = { ..._cells[index], [key]: event.target.value };
    setTranslatedHeaders(_cells);
  }

  const generateRows = translatedHeaders.map((item, index) => {
    return (
      <tr key={item.index}>
        <td>
          {item.origin}<div className="error">{item.error}</div>
        </td>
        <td>
          <input className="translated_text" onChange={onChangeCell(index, 'translated_text')} value={item.translated_text} />
        </td>
        <td>
          <select value={item.dtype} onChange={onChangeOption(index, 'dtype')}>
            <option value='string'>string</option>
            <option value='integer'>integer</option>
            <option value='float'>float</option>
            <option value='boolean'>boolean</option>
            <option value='datetime'>datetime</option>
            <option value='date'>date</option>
            <option value='timestamp'>timestamp</option>
            <option value='record'>record</option>
          </select>
        </td>
      </tr>
    );
  })

  return (
    <div style={{ padding: '20px' }}>
      <p style={{ paddingBottom: '20px' }}>csvファイルの日本語カラム名を<a href={codic_url} target="_blank" rel="noreferrer">codic</a>を使って自動的に英字に変換し、BigQueryにデータをインポートする。</p>
      <button onClick={() => handleTriggerReadFile()}>ファイル選択</button>
      {!!file?.name && <span>ファイル名：{file?.name}</span>}
      <form style={{ display: 'none' }}>
        <input
          type="file"
          accept="text/csv"
          ref={fileInput}
          onChange={onChange}
        />
      </form>
      <div className="translate">
        <div>
          {translatedHeaders.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>text</th>
                  <th>translated text</th>
                  <th>type</th>
                </tr>
              </thead>
              <tbody>{generateRows}</tbody>
            </table>
          )}
        </div>
      </div>
      <div className="createTable">
        <form onSubmit={handleCreateTable}>
          <button type="submit">Create Table</button>
        </form>
        <div>
          {createTableStatus}
        </div>
      </div>
    </div>
  )
}
export default ExcelUploader