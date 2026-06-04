import axios from 'axios';

export const convertNovelToScript = async (novelText, config) => {
  const { data } = await axios.post('/api/convert', { novelText, config });
  if (data.error) {
    throw new Error(data.error);
  }
  return data.yaml;
};
