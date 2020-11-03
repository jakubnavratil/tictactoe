import packageJson from '../../package.json';

export const environment = {
  production: true,
  versions: {
    app: packageJson.version,
  },
  mainUrl: '',
};
