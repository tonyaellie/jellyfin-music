import 'react-native-url-polyfill/auto';

import { Api, Jellyfin } from '@jellyfin/sdk';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Home from './src';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from './src/utils/react-query';

const jellyfin = new Jellyfin({
  clientInfo: {
    name: "Tonya's Jellyfin Music Player",
    version: '0.0.1',
  },
  deviceInfo: {
    name: 'Testing Device',
    id: '4ea994f0-7903-4625-a0e1-2b908b23554d', // TODO: generate a random uuid
  },
});

const App = () => {
  const [api, setApi] = useState<Api | null>(null);

  useEffect(() => {
    if (api) return;
    (async () => {
      const servers = await jellyfin.discovery.getRecommendedServerCandidates(
        'REPLACE_ME_WITH_JELLYFIN_SERVER_URL'
      );
      const best = jellyfin.discovery.findBestServer(servers);
      if (!best) return; // TODO: handle error
      const api = jellyfin.createApi(best.address);
      await api.authenticateUserByName(
        'REPLACE_ME_WITH_JELLYFIN_USERNAME',
        'REPLACE_ME_WITH_JELLYFIN_PASSWORD'
      );
      setApi(api);
    })();
  }, [api]);

  return (
    <QueryClientProvider client={queryClient}>
      <View>
        <StatusBar style="dark" />
        {api ? <Home api={api} /> : <Text tw="text-white">Loading...</Text>}
      </View>
    </QueryClientProvider>
  );
};

export default App;
