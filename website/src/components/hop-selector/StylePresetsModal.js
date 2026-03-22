import {
  Modal,
  Tabs,
  Grid,
  Card,
  Stack,
  Box,
  Group,
  Badge,
  Text,
  Button,
} from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';

const StylePresetsModal = ({
  presetsModalOpen,
  setPresetsModalOpen,
  getAllAromaCombinations,
  applyPreset,
  activePresetStyle,
}) => {
  return (
    <Modal
      opened={presetsModalOpen}
      onClose={() => setPresetsModalOpen(false)}
      title="Browse All Brewing Style Combinations"
      size="xl"
      scrollAreaComponent={Modal.NativeScrollArea}
    >
      <Tabs defaultValue="IPA">
        <Tabs.List>
          <Tabs.Tab value="IPA">IPA Styles</Tabs.Tab>
          <Tabs.Tab value="European">European</Tabs.Tab>
          <Tabs.Tab value="Belgian">Belgian</Tabs.Tab>
          <Tabs.Tab value="English">English</Tabs.Tab>
          <Tabs.Tab value="German">German</Tabs.Tab>
          <Tabs.Tab value="American">American</Tabs.Tab>
          <Tabs.Tab value="Specialty">Specialty</Tabs.Tab>
        </Tabs.List>

        {['IPA', 'European', 'Belgian', 'English', 'German', 'American', 'Specialty'].map(category => (
          <Tabs.Panel key={category} value={category} pt="md">
            <Grid>
              {getAllAromaCombinations()
                .filter(combo => combo.category === category)
                .map((combo, index) => {
                  const isActive = combo.style === activePresetStyle;

                  return (
                    <Grid.Col key={index} span={6}>
                      <Card
                        withBorder
                        p="md"
                        h="100%"
                        style={isActive ? {
                          borderColor: 'var(--mantine-color-green-5)',
                          borderWidth: 2,
                        } : undefined}
                      >
                        <Stack gap="sm" h="100%" justify="space-between">
                          <Box>
                            <Group justify="space-between" mb="xs">
                              <Badge variant="filled" color={isActive ? 'green' : 'grape'}>
                                {combo.style}
                              </Badge>
                              <Group gap={4}>
                                {isActive && (
                                  <Badge size="xs" variant="filled" color="green" leftSection={<IconCheck size={10} />}>
                                    Active
                                  </Badge>
                                )}
                                {combo.type === 'low' && (
                                  <Badge size="xs" variant="outline" color="orange">
                                    Subtle
                                  </Badge>
                                )}
                                {combo.type === 'mixed' && (
                                  <Badge size="xs" variant="outline" color="violet">
                                    Mixed Profile
                                  </Badge>
                                )}
                              </Group>
                            </Group>

                            <Group gap={4} mb="xs" wrap="wrap">
                              {combo.type === 'mixed' ? (
                                <>
                                  {combo.aromasHigh.map((aroma) => (
                                    <Badge key={aroma} size="sm" variant="light" color="green">
                                      {aroma} ↑
                                    </Badge>
                                  ))}
                                  {combo.aromasLow.map((aroma) => (
                                    <Badge key={aroma} size="sm" variant="light" color="red">
                                      {aroma} ↓
                                    </Badge>
                                  ))}
                                </>
                              ) : (
                                combo.aromas.map((aroma) => (
                                  <Badge key={aroma} size="sm" variant="light" color={combo.type === 'low' ? 'orange' : 'blue'}>
                                    {aroma}
                                  </Badge>
                                ))
                              )}
                            </Group>

                            <Text size="sm" c="dimmed">
                              {combo.description}
                            </Text>
                          </Box>

                          <Button
                            size="sm"
                            variant={isActive ? 'filled' : 'light'}
                            color={isActive ? 'green' : undefined}
                            fullWidth
                            leftSection={isActive ? <IconCheck size={14} /> : undefined}
                            onClick={() => {
                              applyPreset(combo);
                              setPresetsModalOpen(false);
                            }}
                          >
                            {isActive ? 'Active' : 'Apply'}
                          </Button>
                        </Stack>
                      </Card>
                    </Grid.Col>
                  );
                })}
            </Grid>
          </Tabs.Panel>
        ))}
      </Tabs>
    </Modal>
  );
};

export default StylePresetsModal;
