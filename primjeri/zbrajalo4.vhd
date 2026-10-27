-- 4-bitno zbrajalo (ripple-carry) od 4 potpuna zbrajala
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
end architecture rtl;
