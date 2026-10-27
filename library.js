/**
 * Built-in VHDL component library
 */

const VHDLLibrary = (() => {

  const BUILTIN_COMPONENTS = [
    {
      name: 'and_gate',
      desc: 'AND vrata (2 ulaza)',
      category: 'Kombinacijska logika',
      ports: 'a, b : IN std_logic; y : OUT std_logic',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity and_gate is
  port (
    a : in  std_logic;
    b : in  std_logic;
    y : out std_logic
  );
end entity and_gate;

architecture rtl of and_gate is
begin
  y <= a and b after 5 ns;
end architecture rtl;`
    },
    {
      name: 'or_gate',
      desc: 'OR vrata (2 ulaza)',
      category: 'Kombinacijska logika',
      ports: 'a, b : IN std_logic; y : OUT std_logic',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity or_gate is
  port (
    a : in  std_logic;
    b : in  std_logic;
    y : out std_logic
  );
end entity or_gate;

architecture rtl of or_gate is
begin
  y <= a or b after 5 ns;
end architecture rtl;`
    },
    {
      name: 'not_gate',
      desc: 'NOT sklop (inverter)',
      category: 'Kombinacijska logika',
      ports: 'a : IN std_logic; y : OUT std_logic',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity not_gate is
  port (
    a : in  std_logic;
    y : out std_logic
  );
end entity not_gate;

architecture rtl of not_gate is
begin
  y <= not a after 4 ns;
end architecture rtl;`
    },
    {
      name: 'nand_gate',
      desc: 'NAND vrata (2 ulaza)',
      category: 'Kombinacijska logika',
      ports: 'a, b : IN std_logic; y : OUT std_logic',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity nand_gate is
  port (
    a : in  std_logic;
    b : in  std_logic;
    y : out std_logic
  );
end entity nand_gate;

architecture rtl of nand_gate is
begin
  y <= not (a and b) after 6 ns;
end architecture rtl;`
    },
    {
      name: 'nor_gate',
      desc: 'NOR vrata (2 ulaza)',
      category: 'Kombinacijska logika',
      ports: 'a, b : IN std_logic; y : OUT std_logic',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity nor_gate is
  port (
    a : in  std_logic;
    b : in  std_logic;
    y : out std_logic
  );
end entity nor_gate;

architecture rtl of nor_gate is
begin
  y <= not (a or b) after 6 ns;
end architecture rtl;`
    },
    {
      name: 'xor_gate',
      desc: 'XOR vrata (ekskluzivni OR)',
      category: 'Kombinacijska logika',
      ports: 'a, b : IN std_logic; y : OUT std_logic',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity xor_gate is
  port (
    a : in  std_logic;
    b : in  std_logic;
    y : out std_logic
  );
end entity xor_gate;

architecture rtl of xor_gate is
begin
  y <= a xor b after 6 ns;
end architecture rtl;`
    },
    {
      name: 'xnor_gate',
      desc: 'XNOR vrata (ekskluzivni NOR)',
      category: 'Kombinacijska logika',
      ports: 'a, b : IN std_logic; y : OUT std_logic',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity xnor_gate is
  port (
    a : in  std_logic;
    b : in  std_logic;
    y : out std_logic
  );
end entity xnor_gate;

architecture rtl of xnor_gate is
begin
  y <= a xnor b after 6 ns;
end architecture rtl;`
    },
    {
      name: 'half_adder',
      desc: 'Half adder (1-bit)',
      category: 'Aritmetika',
      ports: 'a, b : IN std_logic; sum, carry : OUT std_logic',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity half_adder is
  port (
    a     : in  std_logic;
    b     : in  std_logic;
    sum   : out std_logic;
    carry : out std_logic
  );
end entity half_adder;

architecture rtl of half_adder is
begin
  sum   <= a xor b   after 8 ns;
  carry <= a and b   after 6 ns;
end architecture rtl;`
    },
    {
      name: 'full_adder',
      desc: 'Full adder (1-bit)',
      category: 'Aritmetika',
      ports: 'a, b, cin : IN std_logic; sum, cout : OUT std_logic',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity full_adder is
  port (
    a    : in  std_logic;
    b    : in  std_logic;
    cin  : in  std_logic;
    sum  : out std_logic;
    cout : out std_logic
  );
end entity full_adder;

architecture rtl of full_adder is
  signal s1, c1, c2 : std_logic;
begin
  s1   <= a xor b        after 5 ns;
  sum  <= s1 xor cin     after 5 ns;
  c1   <= a and b        after 4 ns;
  c2   <= s1 and cin     after 4 ns;
  cout <= c1 or c2       after 4 ns;
end architecture rtl;`
    },
    {
      name: 'mux_2to1',
      desc: 'Multiplekser 2:1',
      category: 'Multiplekseri',
      ports: 'a, b, sel : IN std_logic; y : OUT std_logic',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity mux_2to1 is
  port (
    a   : in  std_logic;
    b   : in  std_logic;
    sel : in  std_logic;
    y   : out std_logic
  );
end entity mux_2to1;

architecture rtl of mux_2to1 is
begin
  y <= b when sel = '1' else a after 6 ns;
end architecture rtl;`
    },
    {
      name: 'mux_4to1',
      desc: 'Multiplekser 4:1',
      category: 'Multiplekseri',
      ports: 'a,b,c,d : IN; sel : IN(1:0); y : OUT std_logic',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity mux_4to1 is
  port (
    a   : in  std_logic;
    b   : in  std_logic;
    c   : in  std_logic;
    d   : in  std_logic;
    sel : in  std_logic_vector(1 downto 0);
    y   : out std_logic
  );
end entity mux_4to1;

architecture rtl of mux_4to1 is
begin
  process(a, b, c, d, sel)
  begin
    case sel is
      when "00" => y <= a;
      when "01" => y <= b;
      when "10" => y <= c;
      when "11" => y <= d;
      when others => y <= 'X';
    end case;
  end process;
end architecture rtl;`
    },
    {
      name: 'd_flip_flop',
      desc: 'D Flip-Flop (sinhroni)',
      category: 'Sekvencijska logika',
      ports: 'clk, rst, d : IN std_logic; q : OUT std_logic',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity d_flip_flop is
  port (
    clk : in  std_logic;
    rst : in  std_logic;
    d   : in  std_logic;
    q   : out std_logic
  );
end entity d_flip_flop;

architecture rtl of d_flip_flop is
begin
  process(clk)
  begin
    if rising_edge(clk) then
      if rst = '1' then
        q <= '0';
      else
        q <= d;
      end if;
    end if;
  end process;
end architecture rtl;`
    },
    {
      name: 'sr_latch',
      desc: 'SR Zasun (Set-Reset)',
      category: 'Sekvencijska logika',
      ports: 's, r : IN std_logic; q, qn : OUT std_logic',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity sr_latch is
  port (
    s  : in  std_logic;
    r  : in  std_logic;
    q  : out std_logic;
    qn : out std_logic
  );
end entity sr_latch;

architecture rtl of sr_latch is
  signal q_int, qn_int : std_logic := '0';
begin
  q_int  <= r nand qn_int;
  qn_int <= s nand q_int;
  q  <= q_int;
  qn <= qn_int;
end architecture rtl;`
    },
    {
      name: 'register_4bit',
      desc: '4-bitni registar',
      category: 'Registri',
      ports: 'clk, rst : IN; d(3:0) : IN; q(3:0) : OUT',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity register_4bit is
  port (
    clk : in  std_logic;
    rst : in  std_logic;
    d   : in  std_logic_vector(3 downto 0);
    q   : out std_logic_vector(3 downto 0)
  );
end entity register_4bit;

architecture rtl of register_4bit is
begin
  process(clk)
  begin
    if rising_edge(clk) then
      if rst = '1' then
        q <= (others => '0');
      else
        q <= d;
      end if;
    end if;
  end process;
end architecture rtl;`
    },
    {
      name: 'counter_4bit',
      desc: '4-bitni brojač (gore)',
      category: 'Brojači',
      ports: 'clk, rst : IN std_logic; count(3:0) : OUT',
      code: `library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity counter_4bit is
  port (
    clk   : in  std_logic;
    rst   : in  std_logic;
    count : out std_logic_vector(3 downto 0)
  );
end entity counter_4bit;

architecture rtl of counter_4bit is
  signal cnt : unsigned(3 downto 0) := (others => '0');
begin
  process(clk)
  begin
    if rising_edge(clk) then
      if rst = '1' then
        cnt <= (others => '0');
      else
        cnt <= cnt + 1;
      end if;
    end if;
  end process;
  count <= std_logic_vector(cnt);
end architecture rtl;`
    },
    {
      name: 'decoder_2to4',
      desc: 'Dekoder 2:4',
      category: 'Dekoderi',
      ports: 'en : IN; sel(1:0) : IN; y(3:0) : OUT',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity decoder_2to4 is
  port (
    sel : in  std_logic_vector(1 downto 0);
    en  : in  std_logic;
    y   : out std_logic_vector(3 downto 0)
  );
end entity decoder_2to4;

architecture rtl of decoder_2to4 is
begin
  process(sel, en)
  begin
    y <= (others => '0');
    if en = '1' then
      case sel is
        when "00" => y <= "0001";
        when "01" => y <= "0010";
        when "10" => y <= "0100";
        when "11" => y <= "1000";
        when others => y <= (others => '0');
      end case;
    end if;
  end process;
end architecture rtl;`
    },
    {
      name: 'hazard_static0',
      desc: 'Statički hazard-0: f = A · Ā = 0 (impuls pri A: 0→1)',
      category: 'Hazardi',
      ports: 'A : IN std_logic; f : OUT std_logic',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity hazard_static0 is
  generic (
    td1 : time := 5 ns;   -- kašnjenje NOT vrata
    td2 : time := 3 ns    -- kašnjenje AND vrata
  );
  port (
    A : in  std_logic;
    f : out std_logic
  );
end entity hazard_static0;

architecture rtl of hazard_static0 is
  signal nA : std_logic;
begin
  nA <= not A  after td1;
  f  <= A and nA after td2;
end architecture rtl;`,
      testbench: `library ieee;
use ieee.std_logic_1164.all;

entity hazard_static0_tb is
end entity hazard_static0_tb;

architecture sim of hazard_static0_tb is
  signal A : std_logic := '0';
  signal f : std_logic;
begin
  uut : entity work.hazard_static0
    generic map (td1 => 5 ns, td2 => 3 ns)
    port map (A => A, f => f);

  stim : process
  begin
    A <= '0';
    wait for 20 ns;
    -- Prelaz 0→1: ocekivani hazard (f kratko '1' za td1 ns)
    A <= '1';
    wait for 40 ns;
    -- Prelaz 1→0: nema hazarda
    A <= '0';
    wait for 40 ns;
    wait;
  end process;
end architecture sim;`
    },
    {
      name: 'hazard_static1',
      desc: 'Statički hazard-1: f = A·nB + B·C = 1 (impuls pri B: 1→0)',
      category: 'Hazardi',
      ports: 'A, B, C : IN std_logic; f : OUT std_logic',
      code: `library ieee;
use ieee.std_logic_1164.all;

entity hazard_static1 is
  generic (
    td1 : time := 5 ns;   -- kasnjenje NOT vrata
    td2 : time := 3 ns;   -- kasnjenje AND1 (A nB)
    td3 : time := 3 ns;   -- kasnjenje AND2 (B C)
    td4 : time := 3 ns    -- kasnjenje OR vrata
  );
  port (
    A : in  std_logic;
    B : in  std_logic;
    C : in  std_logic;
    f : out std_logic
  );
end entity hazard_static1;

architecture rtl of hazard_static1 is
  signal nB    : std_logic;
  signal term1 : std_logic;
  signal term2 : std_logic;
begin
  nB    <= not B          after td1;
  term1 <= A and nB       after td2;
  term2 <= B and C        after td3;
  f     <= term1 or term2 after td4;
end architecture rtl;`,
      testbench: `library ieee;
use ieee.std_logic_1164.all;

entity hazard_static1_tb is
end entity hazard_static1_tb;

architecture sim of hazard_static1_tb is
  signal A, B, C : std_logic;
  signal f       : std_logic;
begin
  uut : entity work.hazard_static1
    generic map (td1 => 5 ns, td2 => 3 ns, td3 => 3 ns, td4 => 3 ns)
    port map (A => A, B => B, C => C, f => f);

  stim : process
  begin
    A <= '1'; C <= '1';
    -- Pocetno stanje: B=1 -> f=1
    B <= '1';
    wait for 30 ns;
    -- Prelaz B: 1→0: hazard (f kratko '0', 5 ns impuls)
    B <= '0';
    wait for 50 ns;
    -- Prelaz B: 0→1: nema hazarda
    B <= '1';
    wait for 50 ns;
    wait;
  end process;
end architecture sim;`
    }
  ];

  const TEMPLATES = {
    zbrajalo4: {
      vhdl: `-- 4-bitno zbrajalo (ripple-carry) od 4 potpuna zbrajala
-- Sva zbrajala su jednaka: kašnjenje sume (t_sum) i prijenosa (t_carry)
-- podešava se na jednom mjestu, u bloku GENERIC.

library ieee;
use ieee.std_logic_1164.all;

entity zbrajalo4 is
  generic (
    -- >>> KAŠNJENJA - ista za sva 4 potpuna zbrajala <<<
    t_sum   : time := 10 ns;   -- kašnjenje sume
    t_carry : time := 6 ns     -- kašnjenje prijenosa
  );
  port (
    a3, a2, a1, a0 : in  std_logic;   -- prvi broj  A
    b3, b2, b1, b0 : in  std_logic;   -- drugi broj B
    cin            : in  std_logic;
    s3, s2, s1, s0 : out std_logic;   -- suma svakog zbrajala
    cout           : out std_logic
  );
end entity zbrajalo4;

architecture rtl of zbrajalo4 is
  signal c1, c2, c3 : std_logic;      -- prijenosi između zbrajala
begin
  -- FA0
  s0   <= a0 xor b0 xor cin after t_sum;
  c1   <= (a0 and b0) or (a0 and cin) or (b0 and cin) after t_carry;
  -- FA1
  s1   <= a1 xor b1 xor c1 after t_sum;
  c2   <= (a1 and b1) or (a1 and c1) or (b1 and c1) after t_carry;
  -- FA2
  s2   <= a2 xor b2 xor c2 after t_sum;
  c3   <= (a2 and b2) or (a2 and c2) or (b2 and c2) after t_carry;
  -- FA3
  s3   <= a3 xor b3 xor c3 after t_sum;
  cout <= (a3 and b3) or (a3 and c3) or (b3 and c3) after t_carry;
end architecture rtl;`,
      testbench: `-- Testbench za zbrajalo4
-- Ulazne brojeve upišite bit po bit (jedna naredba po retku).
-- Primjer: A = 1011 (11), B = 0110 (6)  ->  17 = 1 0001

library ieee;
use ieee.std_logic_1164.all;

entity zbrajalo4_tb is
end entity zbrajalo4_tb;

architecture sim of zbrajalo4_tb is
begin
  stim : process
  begin
    -- početno stanje: sve 0, pričekaj da se sklop smiri
    a3 <= '0';
    a2 <= '0';
    a1 <= '0';
    a0 <= '0';
    b3 <= '0';
    b2 <= '0';
    b1 <= '0';
    b0 <= '0';
    cin <= '0';
    wait for 20 ns;

    -- >>> A = 1011 <<<
    a3 <= '1';
    a2 <= '0';
    a1 <= '1';
    a0 <= '1';
    -- >>> B = 0110 <<<
    b3 <= '0';
    b2 <= '1';
    b1 <= '1';
    b0 <= '0';
    -- >>> Cin <<<
    cin <= '0';
    wait for 80 ns;
    wait;
  end process;
end architecture sim;`
    },
    empty: {
      vhdl: `library ieee;
use ieee.std_logic_1164.all;

entity my_entity is
  port (
    a : in  std_logic;
    b : in  std_logic;
    y : out std_logic
  );
end entity my_entity;

architecture rtl of my_entity is
begin
  -- Ovdje upiši logiku
  -- Kašnjenje signala: after X ns (npr. after 5 ns)
  y <= a and b after 5 ns;
end architecture rtl;`,
      testbench: ''
    },
    and_gate: {
      vhdl: BUILTIN_COMPONENTS.find(c => c.name === 'and_gate').code,
      testbench: ''
    },
    or_gate: {
      vhdl: BUILTIN_COMPONENTS.find(c => c.name === 'or_gate').code,
      testbench: ''
    },
    not_gate: {
      vhdl: BUILTIN_COMPONENTS.find(c => c.name === 'not_gate').code,
      testbench: ''
    },
    full_adder: {
      vhdl: BUILTIN_COMPONENTS.find(c => c.name === 'full_adder').code,
      testbench: ''
    },
    d_flip_flop: {
      vhdl: BUILTIN_COMPONENTS.find(c => c.name === 'd_flip_flop').code,
      testbench: ''
    },
    mux_2to1: {
      vhdl: BUILTIN_COMPONENTS.find(c => c.name === 'mux_2to1').code,
      testbench: ''
    },
    hazard_static0: {
      vhdl: BUILTIN_COMPONENTS.find(c => c.name === 'hazard_static0').code,
      testbench: BUILTIN_COMPONENTS.find(c => c.name === 'hazard_static0').testbench
    },
    hazard_static1: {
      vhdl: BUILTIN_COMPONENTS.find(c => c.name === 'hazard_static1').code,
      testbench: BUILTIN_COMPONENTS.find(c => c.name === 'hazard_static1').testbench
    }
  };

  // Custom library (localStorage)
  function getCustomComponents() {
    try {
      return JSON.parse(localStorage.getItem('vhdl_custom_lib') || '[]');
    } catch { return []; }
  }

  function saveCustomComponent(name, desc, code) {
    const comps = getCustomComponents();
    const existing = comps.findIndex(c => c.name === name);
    const comp = { name, desc, code, savedAt: new Date().toISOString() };
    if (existing >= 0) comps[existing] = comp;
    else comps.push(comp);
    try { localStorage.setItem('vhdl_custom_lib', JSON.stringify(comps)); } catch (e) {}
  }

  function deleteCustomComponent(name) {
    const comps = getCustomComponents().filter(c => c.name !== name);
    try { localStorage.setItem('vhdl_custom_lib', JSON.stringify(comps)); } catch (e) {}
  }

  function getTemplate(name) {
    return TEMPLATES[name] || TEMPLATES.empty;
  }

  function getAllBuiltin() { return BUILTIN_COMPONENTS; }

  return {
    getAllBuiltin,
    getCustomComponents,
    saveCustomComponent,
    deleteCustomComponent,
    getTemplate
  };
})();
