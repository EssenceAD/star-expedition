"""도트 아이콘 2차 (UI v3 · 메뉴·능력치·재화·직업·버프) — tools/pixel_ui.py 의 팔레트·save 를 씀"""
import importlib.util, sys
spec = importlib.util.spec_from_file_location('pu', 'tools/pixel_ui.py'); pu = importlib.util.module_from_spec(spec)
sys.argv = ['x']; spec.loader.exec_module(pu)
save = pu.save
I = {}
I.update({
'next': ['................','................','......KK........','......KyK.......','......KyyK......','.KKKKKKyyyK.....','.KyyyyyyyyyK....','.KyyyyyyyyyyK...','.KyyyyyyyyyK....','.KKKKKKyyyK.....','......KyyK......','......KyK.......','......KK........','................','................','................'],
'close': ['................','................','..KK......KK....','.KRRK....KRRK...','..KRRK..KRRK....','...KRRKKRRK.....','....KRRRRK......','.....KRRK.......','....KRRRRK......','...KRRKKRRK.....','..KRRK..KRRK....','.KRRK....KRRK...','..KK......KK....','................','................','................'],
'lock': ['................','.....KKKKK......','....KsKKKsK.....','...KsK...KsK....','...KsK...KsK....','..KKKKKKKKKKK...','..KyyyyyyyyoK...','..KyyyyKyyyoK...','..KyyyKKKyyoK...','..KyyyyKyyyoK...','..KyyyyKyyyoK...','..KoooooooooK...','..KKKKKKKKKKK...','................','................','................'],
'star': ['................','.......KK.......','......KYyK......','......KYyK......','.....KYyyyK.....','KKKKKKYyyyKKKKKK','KYYYYYyyyyyyyyoK','.KYyyyyyyyyyyoK.','..KYyyyyyyyyoK..','...KyyyyyyyyK...','...KyyyyyyyoK...','..KyyyoKKKyyoK..','..KyyoK...KyoK..','.KyoKK.....KKoK.','.KKK.........KK.','................'],
'check': ['................','................','............KK..','...........KGK..','..........KGGK..','.........KGGK...','..KK....KGGK....','.KGGK..KGGK.....','..KGGKKGGK......','...KGGGGK.......','....KGGK........','.....KK.........','................','................','................','................'],
'repeat': ['................','.....KKKKKK.....','...KKBBBBBBKK...','..KBBKKKKKKBBK..','..KBK......KBKK.','.KBK......KBBBK.','.KBK.......KKK..','.KBK............','............KBK.','..KKK.......KBK.','.KBBBK......KBK.','.KKBK......KBK..','..KBBKKKKKKBBK..','...KKBBBBBBKK...','.....KKKKKK.....','................'],
'adventure': ['................','.KKKKKKKKKKKKKK.','.KcCCKcCCCKcCCK.','.KcGGKcCCCKcGGK.','.KcGGKcbbCKcGGK.','.KcCCKcbbCKcCCK.','.KccCKcCCCKcrCK.','.KcCCKcGGCKcrrK.','.KcCCKcGGCKcCCK.','.KcGGKcCCCKcCCK.','.KcCCKcCbbKcGGK.','.KcCCKcCbbKcCCK.','.KKKKKKKKKKKKKK.','................','................','................'],
'story': ['................','................','.KKKKKK..KKKKKK.','.KCCCCCKKCCCCCK.','.KCcKKcKKcKKcCK.','.KCccccKKccccCK.','.KCcKKcKKcKKcCK.','.KCccccKKccccCK.','.KCcKKcKKcKKcCK.','.KCccccKKccccCK.','.KCCCCCKKCCCCCK.','.KrrrrrKKrrrrrK.','..KKKKKKKKKKKK..','................','................','................'],
'sk_hammer': ['................','..KKKKKKKK......','.KSSSSSSSsK.....','.KSSSSSSSsK.....','.KsssssssmK.....','..KKKKwKKK......','.....KwK........','.....KwK........','.....KwK........','.....KwK........','.....KwK........','.....KwK........','.....KlK........','.....KKK........','................','................'],
'rune': ['................','......KKKK......','....KKPPPPKK....','...KPPppppPPK...','..KPpppPPpppPK..','..KPppPYYPppPK..','.KPpppYYYYpppPK.','.KPpppYYYYpppPK.','..KPppPYYPppPK..','..KPpppPPpppPK..','...KPPppppPPK...','....KKqqqqKK....','......KKKK......','................','................','................'],
'pointer': ['................','.....KKKKKK.....','.....KyyyyK.....','.....KyyyyK.....','.....KyyyyK.....','.....KyyyyK.....','..KKKKyyyyKKKK..','..KyyyyyyyyyyK..','...KyyyyyyyyK...','....KyyyyyyK....','.....KyyyyK.....','......KyyK......','.......KK.......','................','................','................'],
'warn': ['................','.......KK.......','......KyyK......','......KyyK......','.....KyyyyK.....','.....KyKKyK.....','....KyyKKyyK....','....KyyKKyyK....','...KyyyKKyyyK...','...KyyyyyyyyK...','..KyyyyKKyyyyK..','..KyyyyyyyyyyK..','.KKKKKKKKKKKKKK.','................','................','................'],
'tower': ['................','.....KK..KK.....','.....KsKKsK.....','....KKKKKKKK....','....KSSSSSSK....','....KSsKKsSK....','....KSsKKsSK....','....KSSSSSSK....','....KSsssssK....','....KSsKKssK....','....KSsKKssK....','...KKSSSSSSKK...','...KmmmmmmmmK...','...KKKKKKKKKK...','................','................'],
'target': ['................','.....KKKKKK.....','...KKRRRRRRKK...','..KRRCCCCCCRRK..','..KRCCRRRRCCRK..','.KRCCRRCCRRCCRK.','.KRCRRCRRCRRCRK.','.KRCRCRRRRCRCRK.','.KRCRCRRRRCRCRK.','.KRCRRCRRCRRCRK.','.KRCCRRCCRRCCRK.','..KRCCRRRRCCRK..','..KRRCCCCCCRRK..','...KKRRRRRRKK...','.....KKKKKK.....','................'],
'summon': ['................','.......KK.......','......KBBK......','.....KBCBBK.....','....KBCBBbbK....','...KBCBBbbbnK...','...KBBBbbbbnK...','...KBBbbbbnnK...','....KBbbbnnK....','.....KbbnnK.....','......KnnK......','....KKKKKKKK....','...KPPPPPPPPK...','...KKKKKKKKKK...','................','................'],
'skip': ['................','................','.KK....KK..KK...','.KyK...KyK.KyK..','.KyyK..KyyKKyK..','.KyyyK.KyyyKyK..','.KyyyyKKyyyyyK..','.KyyyyyKyyyyyK..','.KyyyyKKyyyyyK..','.KyyyK.KyyyKyK..','.KyyK..KyyKKyK..','.KyK...KyK.KyK..','.KK....KK..KK...','................','................','................'],
'power': ['................','..........KKK...','.........KRRK...','........KRRK....','.......KRRK.....','......KRRRKKK...','.....KRRRRRRK...','....KKKKRRRK....','.......KRRK.....','......KRRK......','.....KRRK.......','....KRRK........','....KKK.........','................','................','................'],
'offline': ['................','.....KKKKKK.....','...KKCCCCCCKK...','..KCCCCKCCCCCK..','..KCCCCKCCCCCK..','.KCCCCCKCCCCCCK.','.KCCCCCKCCCCCCK.','.KCCCCCKKKKCCCK.','.KCCCCCCCCCCCCK.','.KCCCCCCCCCCCCK.','..KCCCCCCCCCCK..','..KCCCCCCCCCCK..','...KKCCCCCCKK...','.....KKKKKK.....','................','................'],
'menu': ['................','................','................','..KKKKKKKKKKKK..','..KSSSSSSSSSSK..','..KKKKKKKKKKKK..','................','..KKKKKKKKKKKK..','..KSSSSSSSSSSK..','..KKKKKKKKKKKK..','................','..KKKKKKKKKKKK..','..KSSSSSSSSSSK..','..KKKKKKKKKKKK..','................','................'],
'emote': ['................','.....KKKKKK.....','...KKyyyyyyKK...','..KyyyyyyyyyyK..','..KyyKKyyKKyyK..','.KyyyKKyyKKyyyK.','.KyyyyyyyyyyyyK.','.KyyyyyyyyyyyyK.','.KyyKyyyyyyKyyK.','.KyyyKKKKKKyyyK.','..KyyyyyyyyyyK..','..KyyyyyyyyyyK..','...KKyyyyyyKK...','.....KKKKKK.....','................','................'],
'badge': ['................','...KK......KK...','...KRK....KRK...','....KRK..KRK....','.....KRKKRK.....','.....KKKKKK.....','....KyyyyyyK....','...KyYYyyyyoK...','...KyYyyyyyoK...','...KyyyyyyyoK...','...KyyyyyyyoK...','....KyoooooK....','.....KKKKKK.....','................','................','................'],
'chest': ['................','................','...KKKKKKKKKK...','..KHHHHHHHHHHK..','..KhyhhhhhhyhK..','.KKKKKKKKKKKKKK.','.KyyyyyKKyyyyyK.','.KWhhhKYYKhhhWK.','.KWhhhKyyKhhhWK.','.KWhyhhKKhhyhWK.','.KWWyWWWWWWyWWK.','.KKKKKKKKKKKKKK.','................','................','................','................'],
'booster': ['................','.......KK.......','......KSSK......','.....KSBBSK.....','.....KSBBSK.....','.....KSSSSK.....','.....KSSSSK.....','....KKSSSSKK....','...KRKSSSSKRK...','...KRKKKKKKRK...','....KKoyyoKK....','......KyyK......','......KooK......','.......KK.......','................','................'],
'hp': ['................','................','...KKK...KKK....','..KRRRK.KRRRK...','.KRCRRRKRRRRrK..','.KRCRRRRRRRRrK..','.KRRRRRRRRRRrK..','..KRRRRRRRRrK...','...KRRRRRRrK....','....KRRRRrK.....','.....KRRrK......','......KrK.......','.......K........','................','................','................'],
'atk': ['................','.............KK.','............KSK.','...........KSSK.','..........KSSK..','.........KSSK...','........KSSK....','...KK..KSSK.....','...KyKKSSK......','....KyKSK.......','.....KyK........','....KwKyK.......','...KwK.KyK......','..KwK...KK......','..KK............','................'],
'def': ['................','..KKKKKKKKKKKK..','..KSSSSSSSSSsK..','..KSsssssssssK..','..KSssBBBBsssK..','..KSssBBBBsssK..','..KSsssBBssssK..','..KSsssBBssssK..','...KSsssssssK...','...KSsssssssK...','....KSsssssK....','.....KSsssK.....','......KssK......','.......KK.......','................','................'],
'spd': ['................','................','..KKKK..........','.KBBBBK.........','..KKKKBK..KKK...','.....KBK.KBBBK..','..KKKKBKKBBBBBK.','.KBBBBBBBBBBBBK.','..KKKKKKKBBBBBK.','.......KBBBBBK..','......KBBBBBK...','......KKKKKK....','................','................','................','................'],
'crit': ['................','.......KK.......','..K....KyK...K..','..KyK..KyK..KyK.','...KyK.KyK.KyK..','....KyKKyKKyK...','.KKKKyyYYyyKKKK.','.KyyyyYYYYyyyyK.','.KKKKyyYYyyKKKK.','....KyKKyKKyK...','...KyK.KyK.KyK..','..KyK..KyK..KyK.','..K....KyK...K..','.......KK.......','................','................'],
'critDmg': ['................','.......KK.......','..K....KRK...K..','..KRK..KRK..KRK.','...KRK.KRK.KRK..','....KRKKRKKRK...','.KKKKRRYYRRKKKK.','.KRRRRYYYYRRRRK.','.KKKKRRYYRRKKKK.','....KRKKRKKRK...','...KRK.KRK.KRK..','..KRK..KRK..KRK.','..K....KRK...K..','.......KK.......','................','................'],
'mana': ['................','.......KK.......','......KBBK......','......KBBK......','.....KBBBBK.....','....KBCBBBBK....','....KBCBBBBK....','...KBBCBBBBbK...','...KBBBBBBBbK...','...KBBBBBBbbK...','....KBBBBbbK....','.....KKKKKK.....','................','................','................','................'],
})
I_atk = I['atk']

# 동전 (재화 그림이 없는 것): 테 + 가운데 글자
def coin(c1, c2, mark):
    rows = ['................','.....KKKKKK.....','...KK111111KK...','..K1122222211K..','..K1222222221K..','.K122222222221K.','.K122222222221K.','.K122222222221K.','.K122222222221K.','.K122222222221K.','..K1222222221K..','..K1122222211K..','...KK111111KK...','.....KKKKKK.....','................','................']
    rows = [r.replace('1', c1).replace('2', c2) for r in rows]
    for (x, y) in mark:
        r = list(rows[y]); r[x] = 'K'; rows[y] = ''.join(r)
    return rows
ring = [(6,5),(7,5),(8,5),(9,5),(5,6),(10,6),(5,7),(10,7),(5,8),(10,8),(6,9),(7,9),(8,9),(9,9)]
I['guildCoin'] = coin('n', 'B', [(7,5),(8,5),(6,6),(9,6),(6,7),(7,7),(8,7),(9,7),(7,8),(8,8),(7,9),(8,9)])
I['arenaCoin'] = coin('d', 'R', [(5,5),(10,5),(6,6),(9,6),(7,7),(8,7),(6,8),(9,8),(5,9),(10,9)])
I['towerCoin'] = coin('k', 'h', [(7,4),(8,4),(7,5),(8,5),(6,6),(9,6),(6,7),(9,7),(6,8),(9,8),(6,9),(7,9),(8,9),(9,9)])
I['tierMat'] = ['................','......KKKK......','....KKBBBBKK....','...KBCBBBBBnK...','..KBCBBBBBBBnK..','..KKKKKKKKKKKK..','..KBBBBBBBBBnK..','...KBBBBBBBnK...','....KBBBBBnK....','.....KBBBnK.....','......KBnK......','.......KK.......','................','................','................','................']
I['exShard'] = ['................','.........KK.....','........KPPK....','.......KPCPK....','......KPCPPK....','.....KPCPPK.....','....KPPPPK......','...KPPPPK.......','..KqPPPK........','..KqqPK.........','..KKKK..........','................','................','................','................','................']
I['bossMat'] = coin('d', 'r', [(6,6),(9,6),(6,7),(9,7),(6,9),(7,9),(8,9),(9,9)])
I['token'] = coin('e', 'g', ring)
I['treasureShard'] = I['exShard']
I['battle'] = I_atk
# 위치 (전방·중앙·후방)
I['zone_front'] = I['def']; I['zone_mid'] = ['................','.......KK.......','......KyyK......','.....KyYyyK.....','.....KyYyyK.....','....KyYyyyyK....','....KyyyyyyK....','.....KyyyyK.....','.....KyyyyK.....','......KyyK......','......KyyK......','.......KK.......','................','................','................','................']
I['zone_back'] = ['................','..KK............','..KhKK..........','...KhhKK......K.','...KhK.KK....KyK','....Kh..KKKKKyyK','....Kh.....KyyK.','....Kh....KyyK..','....Kh..KKKKyK..','...KhK.KK...K...','...KhhKK........','..KhKK..........','..KK............','................','................','................']
for k, v in I.items(): save(f'icons/{k}', v)
# 직업 9 (16칸)
J = {
'knight': I['def'], 'warrior': I_atk, 'fighter': ['................','................','....KKKKKKK.....','...KhhhKhhhK....','..KKhhhKhhhKK...','..KhKhhKhhKhK...','..KhhhhhhhhhK...','..KhhhhhhhhhK...','..KhhhhhhhhhK...','...KhhhhhhhK....','...KhhhhhhhK....','....KKKKKKK.....','................','................','................','................'],
'assassin': ['................','......KK........','.....KSK........','.....KSK........','....KSSK........','....KSSK........','....KSSK........','...KSSSK........','...KSSsK........','..KKKKKKK.......','....KwK.........','....KwK.........','....KyK.........','....KK..........','................','................'],
'archer': I['zone_back'], 'engineer': [],
'mage': ['................','.......KK.......','......KPPK......','.....KPYPK......','....KPPPPPK.....','...KPPPPPPPK....','..KKKKKKKKKKK...','.KqqqqqqqqqqqK..','..KKKKKKKKKKK...','................','................','................','................','................','................','................'],
'priest': ['................','......KKKK......','......KyyK......','......KyyK......','..KKKKKyyKKKKK..','..KyyyyyyyyyyK..','..KyyyyyyyyyyK..','..KKKKKyyKKKKK..','......KyyK......','......KyyK......','......KyyK......','......KyyK......','......KKKK......','................','................','................'],
'druid': ['................','........KKK.....','......KKGGGK....','.....KGGGGGK....','....KGGGGGGK....','...KGGGGGGK.....','...KGGeGGK......','..KGGeGGK.......','..KGeGKK........','..KeKK..........','.KeK............','.KK.............','................','................','................','................'],
}
import os
os.makedirs('public/art/ui2/jobs', exist_ok=True)
for k, v in J.items():
    if k == 'engineer':
        from PIL import Image
        Image.open('public/art/ui2/icons/gear.png').save('public/art/ui2/jobs/engineer.png'); continue
    save(f'jobs/{k}', v)
# 버프 12 (12칸 · 받침 색은 화면에서)
B = {
'atkUp': ['............','.....KK.....','....KGGK....','...KGGGGK...','..KGGGGGGK..','..KKKGGKKK..','....KGGK....','....KGGK....','....KGGK....','....KKKK....','............','............'],
'defUp': ['............','.KKKKKKKKKK.','.KSSSSSSSsK.','.KSsssssssK.','.KSssBBsssK.','.KSssBBsssK.','..KSssssK...','...KSssK....','....KssK....','.....KK.....','............','............'],
'shield': ['............','..KKKKKKKK..','.KBBBBBBBBK.','.KBCBBBBBnK.','.KBCBBBBBnK.','.KBBBBBBBnK.','..KBBBBBnK..','...KBBBnK...','....KBnK....','.....KK.....','............','............'],
'regen': ['............','....KKKK....','....KGGK....','....KGGK....','.KKKKGGKKKK.','.KGGGGGGGGK.','.KGGGGGGGGK.','.KKKKGGKKKK.','....KGGK....','....KGGK....','....KKKK....','............'],
'speedUp': ['............','............','.KK...KK....','.KBK..KBK...','.KBBK.KBBK..','.KBBBKKBBBK.','.KBBBBKBBBBK','.KBBBKKBBBK.','.KBBK.KBBK..','.KBK..KBK...','.KK...KK....','............'],
'mark': ['............','....KKKK....','..KKRRRRKK..','..KRCCCCRK..','.KRCKKKKCRK.','.KRCKRRKCRK.','.KRCKRRKCRK.','.KRCKKKKCRK.','..KRCCCCRK..','..KKRRRRKK..','....KKKK....','............'],
'taunt': ['............','..KK....KK..','.KRRK..KRRK.','.KRRRKKRRRK.','..KRRRRRRK..','..KRKRRKRK..','..KRRRRRRK..','...KRKKRK...','...KRRRRK...','....KKKK....','............','............'],
'stun': ['............','.KK......KK.','.KyK.KK.KyK.','..KK.KyK.KK.','.....KYK....','..KKKKyKKKK.','..KyYYYYYyK.','..KKKKyKKKK.','.....KYK....','..KK.KyK.KK.','.KyK.KK.KyK.','.KK......KK.'],
'silence': ['............','.KKKKKKKKKK.','.KCCCCCCCCK.','.KCKKCRRCCK.','.KCCCRRRCCK.','.KCCRRRCCCK.','.KCRRRCKKCK.','.KCCCCCCCCK.','.KKKKCKKKKK.','....KCK.....','....KK......','............'],
'freeze': ['............','.....KK.....','..KK.KBK.KK.','..KBKKBKKBK.','...KBKBKBK..','.KKKKBBBKKKK','.KBBBBCBBBBK','.KKKKBBBKKKK','...KBKBKBK..','..KBKKBKKBK.','..KK.KBK.KK.','.....KK.....'],
'burn': ['............','.....KK.....','....KoK.....','....KoyK....','...KooyK.K..','..KoyoyKKoK.','..KoyYyooyK.','.KoyYYYyoyK.','.KoyYYYYyoK.','.KooyyyyooK.','..KKKKKKKK..','............'],
'poison': ['............','....KKKK....','...KGGGGK...','..KGCGGGGK..','..KGKKGKKGK.','..KGKKGKKGK.','..KGGGGGGGK.','...KGKGKGK..','...KKKKKKK..','............','............','............'],
}
os.makedirs('public/art/ui2/buffs', exist_ok=True)
for k, v in B.items(): save(f'buffs/{k}', v)
print('icons', len(I), 'jobs', len(J), 'buffs', len(B))
