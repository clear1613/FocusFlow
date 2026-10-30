import App from './App';
import { useTabStore } from './stores/tabStore';
import { TabStandby } from './components/common/TabStandby';

export function TabApplication() {
  const { role, storageNotice } = useTabStore();
  return role === 'writer' ? <App initialStorageNotice={storageNotice} /> : <TabStandby role={role} />;
}
