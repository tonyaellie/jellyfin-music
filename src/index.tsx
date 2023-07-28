import { Api } from '@jellyfin/sdk';
import { useQuery } from '@tanstack/react-query';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import React, { useMemo, useState } from 'react';
import { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';

const renderItem = ({
  item,
  setSelectedId,
  selectedId,
  playSong,
  setQueue,
  queue,
}: {
  item: BaseItemDto;
  setSelectedId: (id: string) => void;
  selectedId: string | null;
  playSong: (id: string) => void;
  setQueue: (queue: string[]) => void;
  queue: string[];
}) => {
  return (
    <Pressable
      key={item.Id}
      onPress={() => {
        console.log(`pressed ${item.Name} with id ${item.Id}`);
        if (!item.Id) {
          throw new Error('Item has no id');
        }

        setSelectedId(item.Id!);
        playSong(item.Id!);
      }}
      onLongPress={() => {
        console.log(`long pressed ${item.Name} with id ${item.Id}`);
        if (!item.Id) {
          throw new Error('Item has no id');
        }

        if (queue.length === 0 && !selectedId) {
          setSelectedId(item.Id!);
          playSong(item.Id!);
        } else {
          setQueue([...queue, item.Id!]);
          // show indicator that song was added to queue
          alert(`Added ${item.Name} to queue!`); // TODO: replace with something better
        }
      }}
    >
      <Text tw={`text-lg ${selectedId === item.Id ? 'text-fuchsia-700' : ''}`}>
        {item.Name}
      </Text>
      <Text className="text-slate-700">{item.Artists?.join(', ')}</Text>
    </Pressable>
  );
};

const Home = ({ api }: { api: Api }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [progress, setProgress] = useState(0); // [0, 100]
  const [duration, setDuration] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [showQueue, setShowQueue] = useState(false);

  const playSong = async (itemId: string) => {
    console.log(`playing song with id ${itemId}`);
    try {
      const url = `${api.basePath}/Audio/${itemId}/stream.mp3?Static=true&deviceId=${api.deviceInfo.id}&api_key=${api.accessToken}&mediaSourceId=${itemId}`;
      console.log('got source', url);
      // console.log(source);
      if (!sound) {
        Audio.setAudioModeAsync({
          playThroughEarpieceAndroid: true,
          staysActiveInBackground: true,
        });
      }
      const soundResource = sound ? sound : new Audio.Sound();
      if (!sound) {
        soundResource.setOnPlaybackStatusUpdate(async (status) => {
          // console.log('status', status);
          if (!status.isLoaded) return;
          setProgress(status.positionMillis / (status.durationMillis ?? 0));
          setDuration(status.durationMillis ?? 0);
          if (status.didJustFinish) {
            console.log('finished');
            await soundResource.unloadAsync();
            if (queue.length > 0) {
              const next = queue.shift()!;
              console.log('next', next);
              setSelectedId(next);
              playSong(next);
            } else {
              setSelectedId(null);
              setDuration(0);
              console.log('queue empty');
            }
          }
        });
      } else {
        await soundResource.stopAsync();
        soundResource.unloadAsync();
      }
      await soundResource.loadAsync({
        uri: url,
      });
      void soundResource.playAsync();
      setSound(soundResource);
    } catch (e) {
      console.log(e);
    }
  };

  const library = useQuery(['library'], {
    queryFn: () =>
      getItemsApi(api).getItems({
        userId: '5926be527a65478fadaebae47c8c9835',
        parentId: '7e64e319657a9516ec78490da03edccb',
        includeItemTypes: ['Audio'],
        recursive: true,
      }),
  });

  const selectedDetails = useMemo(() => {
    if (!selectedId) return null;
    return library.data?.data.Items?.find((item) => item.Id === selectedId);
  }, [selectedId, library.data]);

  if (library.isLoading) {
    return <Text>Loading...</Text>;
  }

  if (library.isError) {
    return <Text>Error fetching data. {JSON.stringify(library.error)}</Text>;
  }

  return (
    <SafeAreaView tw="h-full">
      <View
        tw="h-16"
        // TODO: find a better way to do this
      />
      <FlatList
        data={library.data.data.Items}
        keyExtractor={(item) => item.Id!}
        renderItem={({ item }) =>
          renderItem({
            item,
            selectedId,
            setSelectedId,
            playSong,
            setQueue,
            queue,
          })
        }
        extraData={{
          selectedId,
        }}
        initialNumToRender={16}
        windowSize={2}
      />
      <Pressable
        tw="h-16 bg-slate-400 p-4"
        onPress={() => {
          console.log(queue);
          setShowQueue(true);
        }}
      >
        <Text>Now Playing - {selectedDetails?.Name}</Text>
        <Slider
          className="w-full h-8"
          minimumValue={0}
          maximumValue={1}
          value={progress}
          onSlidingComplete={async (value) => {
            if (!sound) return;
            console.log('setting position to', value * duration);
            await sound.setPositionAsync(value * duration);
          }}
          tapToSeek={true}
        />
      </Pressable>
      <Modal
        animationType="slide"
        visible={showQueue}
        transparent={true}
        onRequestClose={() => {
          setSelectedId(null);
        }}
      >
        <View tw="h-2/3 bg-slate-400 absolute bottom-0 w-full">
          <Pressable
            onPress={() => {
              setShowQueue(false);
            }}
            tw="w-full bg-slate-600 h-8"
          >
            <Text>Close</Text>
          </Pressable>
          <ScrollView tw="h-full">
            {queue.map((id) => (
              <Pressable
                key={id}
                onPress={() => {
                  setSelectedId(id);
                  playSong(id);
                }}
              >
                <Text tw="text-lg">
                  {
                    library.data?.data.Items?.find((item) => item.Id === id)
                      ?.Name
                  }
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Home;
