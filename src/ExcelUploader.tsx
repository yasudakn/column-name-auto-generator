import React, { ChangeEvent, FC, useRef, useState } from 'react'
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
  origin: string;
  translated_text?: string;
  error?: string;
}

const ExcelUploader: FC = () => {
  const urls = {
    translate: "/v1/engine/translate.json",
    createTable: "/create"
  };
  const request_base: TranslateRequest = {
    project_id: '21109',
    text: '',
    casing: "lower underscore"
  }
  const codic_url = "https://codic.jp/";
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  let request = request_base;
  const [buffer, setBuffer] = useState<Array<TranslatedText>>([]);
  const [createTableStatus, setCreateTableStatus] = useState("");
  const requestMaxLength = 24;

  const handleTriggerReadFile = () => {
    if (fileInput.current) {
      fileInput.current.click();
    }
  }
  const handleReadFile = (fileObj?: File) => {
    if (fileObj) {
      setFile(fileObj);
      fileObj.arrayBuffer().then(async (buffer) => {
        // TODO ヘッダー行のみ読み込めば良い
        const decodedString = iconv.decode(Buffer.from(buffer), 'utf-8');
        // const workbook = read(buffer, { type: 'buffer', bookVBA: true });
        // const firstSheetName = workbook.SheetNames[0];
        // const worksheet = workbook.Sheets[firstSheetName];
        // const data = utils.sheet_to_json(worksheet, {header:1});
        const result = await csvParse(decodedString, { columns: true });
        const translated_results = await Promise.all(
          Object.keys(result[0]).filter(
            x => x.trim()).map(
              text => translate(text)));
        setBuffer(translated_results.flat());
      })
    }
  }
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let input = event.target;
    let files: FileList | null = input.files;
    handleReadFile(files ? files[0] : undefined);
  }
  const translate = (text: string): Promise<TranslatedText> => {
    let error = text.length > requestMaxLength ?
      `max length ${requestMaxLength}` : undefined;
    request.text = text.slice(0, requestMaxLength);
    const result = axios.post(urls.translate, request)
      .then(res => {
        let data = JSON.parse(JSON.stringify(res.data[0]))
        console.log(data.translated_text);
        return { origin: text, translated_text: data.translated_text, error: error };
      }).catch(e => {
        console.error(e);
        return { origin: text, translated_text: undefined, error: String(e) };
      })
    return result;
  }

  const createFormData = () => {
    const json = JSON.stringify({
      filename: file?.name,
      header: buffer });
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
    const _cells = [...buffer];
    _cells[index] = { ..._cells[index], [key]: event.target.value };
    setBuffer(_cells);
  }

  const generateRows = buffer.map((item, index) => {
    return (
      <tr key={index}>
        <td>
          {item.origin}<div className="error">{item.error}</div>
        </td>
        <td>
          <input className="translated_text" onChange={onChangeCell(index, 'translated_text')} value={item.translated_text} />
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
          {buffer.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>text</th>
                  <th>translated text</th>
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