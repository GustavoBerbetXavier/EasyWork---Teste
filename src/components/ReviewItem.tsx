import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatInboxTime } from '@/lib/format';
import type { Review } from '@/lib/types';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';
import { AppIcon, Avatar } from './ui';

export function ReviewItem({ review }: { review: Review }) {
  return (
    <View style={item.review}>
      <Avatar name={review.client_name} size={36} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.conversationTop}>
          <Text style={styles.timelineRole}>{review.client_name}</Text>
          <Text style={styles.conversationTime}>{formatInboxTime(review.created_at)}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {[1, 2, 3, 4, 5].map((value) => (
            <AppIcon key={value} name={value <= review.rating ? 'star' : 'star-outline'} color={C.amber} size={12} />
          ))}
        </View>
        {review.comment ? <Text style={styles.bodyText}>{review.comment}</Text> : null}
      </View>
    </View>
  );
}

const item = StyleSheet.create({
  review: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
});
