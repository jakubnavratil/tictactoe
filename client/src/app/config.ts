import { environment } from 'environments/environment';

export const Config = {
  get apiUrl(): string {
    return `${location.protocol.replace('http', 'ws')}//${location.hostname}${
      location.port && `:${location.port}`
    }${environment.mainUrl}`;
  },
};
