import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Achievement, achievements, Run } from './run';
import { c, st } from './styles';

function AwardCard({ award }: { award: Achievement }) {
  return <View style={[st.award, award.unlocked && st.awardUnlocked]}>
    <View style={[st.awardIcon, award.unlocked && { backgroundColor: c.lime }]}>
      <Ionicons name={award.icon as keyof typeof Ionicons.glyphMap} size={24} color={award.unlocked ? c.bg : c.muted}/>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[st.awardTitle, !award.unlocked && { color: c.muted }]}>{award.title}</Text>
      <Text style={st.awardDetail}>{award.detail}</Text>
      <View style={st.progressBg}><View style={[st.progressFill, { width: `${Math.round(award.progress * 100)}%` }]}/></View>
    </View>
    {award.unlocked && <Ionicons name="checkmark-circle" size={20} color={c.lime}/>}
  </View>;
}

export function Awards({ runs }: { runs: Run[] }) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const awards = React.useMemo(() => achievements(runs), [runs]);
  const unlocked = awards.filter(award => award.unlocked).length;
  const next = awards.filter(award => !award.unlocked).sort((a, b) => b.progress - a.progress).slice(0, 3);
  const categories = [...new Set(awards.map(award => award.category))];

  return <>
    <View style={st.section}><View><Text style={st.kicker}>EARNED, NEVER GIVEN</Text><Text style={st.sectionTitle}>Achievements</Text></View></View>
    <Text style={st.awardsCount}>{unlocked} OF {awards.length} UNLOCKED</Text>
    {next.length > 0 && <>
      <Text style={{ color: c.lime, fontSize: 11, fontWeight: '900', letterSpacing: 1.6, marginBottom: 12 }}>CLOSE TO YOUR NEXT AWARDS</Text>
      {next.map(award => <AwardCard key={award.id} award={award}/>)}
    </>}
    <Text style={{ color: c.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.6, marginTop: 18, marginBottom: 12 }}>ALL CATEGORIES</Text>
    {categories.map(category => {
      const group = awards.filter(award => award.category === category);
      const earned = group.filter(award => award.unlocked).length;
      const open = expanded === category;
      return <View key={category}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${category}, ${earned} of ${group.length} unlocked`}
          onPress={() => setExpanded(open ? null : category)}
          style={{ minHeight: 62, borderWidth: 1, borderColor: c.line, backgroundColor: c.panel, borderRadius: 17, marginBottom: open ? 10 : 9, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}><Text style={{ color: c.white, fontSize: 13, fontWeight: '900', letterSpacing: .8 }}>{category}</Text>
            <Text style={{ color: c.muted, fontSize: 11, marginTop: 4 }}>{earned} / {group.length} unlocked</Text></View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={c.lime}/>
        </Pressable>
        {open && group.map(award => <AwardCard key={award.id} award={award}/>)}
      </View>;
    })}
    <View style={{ height: 90 }}/>
  </>;
}
